import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';

// POST /api/cart/validate-stock
// body: { items: [{ productId, variantId, size, qty, name }] }
//
// Re-checks each cart line against the live database (not the client's
// stale cart state) and reports any lines that are out of stock,
// insufficient in quantity, or no longer available at all.
export async function POST(req) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];

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
      availableStock,
    });
  }

  for (const item of items) {
    const product = productMap.get(String(item.productId));

    if (!product || !product.isActive) {
      report(item, 'unavailable', 0);
      continue;
    }

    const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
    if (!variant) {
      report(item, 'unavailable', 0);
      continue;
    }

    const sizeEntry = variant.sizes.find((s) => s.size === item.size);
    const available = sizeEntry?.stock || 0;

    if (available <= 0) {
      report(item, 'out_of_stock', 0);
    } else if (item.qty > available) {
      report(item, 'insufficient_stock', available);
    }
  }

  return NextResponse.json({ valid: issues.length === 0, issues });
}