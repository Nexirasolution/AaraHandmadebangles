import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import { resolveStock } from '@/lib/stock';

// POST body: { items: [{ productId, variantId, size, qty, name, isCombo }] }
export async function POST(req) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  // Combos are validated server-side when the order is built.
  const items = (Array.isArray(body.items) ? body.items : []).filter((i) => !i.isCombo);

  if (items.length === 0) {
    return NextResponse.json({ valid: true, issues: [] });
  }

  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const issues = [];

  function report(item, reason, availableStock) {
    issues.push({
      productId: item.productId,
      variantId: item.variantId,
      size: item.size,
      name: item.name,
      reason,
      availableStock
    });
  }

  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product || !product.isActive) { report(item, 'unavailable', 0); continue; }

    const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
    if (!variant) { report(item, 'unavailable', 0); continue; }

    const st = resolveStock(variant, item.size);
    if (!st.found) { report(item, 'unavailable', 0); continue; }

    if (st.stock <= 0) report(item, 'out_of_stock', 0);
    else if (item.qty > st.stock) report(item, 'insufficient_stock', st.stock);
  }

  return NextResponse.json({ valid: issues.length === 0, issues });
}