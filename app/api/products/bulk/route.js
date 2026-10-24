import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import slugify from 'slugify';
import { requireAdmin } from '@/lib/apiAuth';
import { OCCASIONS } from '@/lib/jewellery';

// POST /api/products/bulk
// body: {
//   category, skuPrefix, description,
//   material, finish, stoneType,          (optional text, e.g. "Silk Thread", "Gold Plated", "Kundan")
//   piecesInSet,                          (optional, default 1 — e.g. 4 for a set of 4 bangles)
//   occasion: [ 'Daily Wear' | 'Festive' | 'Wedding' | 'Party' | 'Office' | 'Gifting', ... ],
//   careInstructions,
//   weight (grams per purchase unit, required),
//   price, compareAtPrice, sizes: [{ size, stock }],   (size = "2.4" etc. or "Free Size")
//   images: [url, url, ...], tags,
//   isReadyToShip, sizeChart: [url, url, ...]
// }
// Creates ONE product per image.
// - Title = auto-derived from the CATEGORY name + zero-padded number,
//   e.g. category "Silk Thread Bangles" -> SILKTHREADBANGLES001, ...002...
//   (continues from the highest existing number for that title-code in
//   that category, so repeated bulk uploads don't collide)
// - SKU = admin-typed short code + zero-padded number, e.g. "MT" -> MT001, MT002...
//   (continues from the highest existing SKU with that code, globally,
//   since SKU is a global-unique field)
// - Every other field, if provided, is applied identically to every product
//   created in this batch. weight is the shipping weight of one purchase
//   unit (one pair / set / piece) in grams and is required.
//   sizeChart (size-guide images) is optional — if omitted, the storefront
//   falls back to the category's own size chart images.
export const POST = requireAdmin(async (req) => {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      category,
      skuPrefix,
      description = '',
      material = '',
      finish = '',
      stoneType = '',
      piecesInSet = 1,
      occasion = [],
      careInstructions = '',
      weight = 0,
      price,
      compareAtPrice = 0,
      sizes = [],
      images = [],
      tags = [],
      isReadyToShip = false,
      sizeChart = [],
    } = body;

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!skuPrefix?.trim()) {
      return NextResponse.json({ error: 'SKU code is required' }, { status: 400 });
    }
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }
    if (!price || Number(price) <= 0) {
      return NextResponse.json({ error: 'Price is required' }, { status: 400 });
    }
    if (!weight || Number(weight) <= 0) {
      return NextResponse.json({ error: 'Weight (grams) is required' }, { status: 400 });
    }
    const sizeEntries = (sizes || [])
      .filter((s) => s.size)
      .map((s) => ({ size: String(s.size).trim(), stock: Number(s.stock) || 0 }));
    if (sizeEntries.length === 0) {
      return NextResponse.json({ error: 'At least one size with stock is required' }, { status: 400 });
    }

    // Accept either an array of image URLs (current format) or a single
    // legacy string, so older clients can't accidentally wipe the field.
    const sizeChartImages = Array.isArray(sizeChart)
      ? sizeChart.filter(Boolean)
      : (sizeChart ? [sizeChart] : []);

    // Only keep occasions the storefront knows about, so a stale client
    // can't store junk values.
    const occasionClean = Array.isArray(occasion)
      ? occasion.filter((o) => OCCASIONS.includes(o))
      : [];

    const piecesInSetClean = Math.max(1, Math.floor(Number(piecesInSet)) || 1);

    const cat = await Category.findById(category);
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // --- Title code: auto-derived from the category name ---
    const titleCode = (cat.name || 'PRODUCT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (!titleCode) {
      return NextResponse.json(
        { error: 'Category name must contain letters/numbers to generate a title' },
        { status: 400 }
      );
    }

    // --- SKU code: admin-typed short code, e.g. "MT" ---
    const skuCode = skuPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!skuCode) {
      return NextResponse.json({ error: 'SKU code must contain letters/numbers' }, { status: 400 });
    }

    // Continue title numbering from the highest existing TITLECODE### in this category
    const existingTitles = await Product.find({
      category: cat._id,
      name: { $regex: `^${titleCode}\\d+$`, $options: 'i' },
    }).select('name');

    let maxTitleNum = 0;
    const titleNumRe = new RegExp(`^${titleCode}(\\d+)$`, 'i');
    for (const p of existingTitles) {
      const match = p.name.match(titleNumRe);
      if (match) maxTitleNum = Math.max(maxTitleNum, parseInt(match[1], 10));
    }

    // Continue SKU numbering from the highest existing SKUCODE### (global, SKU is unique across all products)
    const existingSkus = await Product.find({
      sku: { $regex: `^${skuCode}\\d+$`, $options: 'i' },
    }).select('sku');

    let maxSkuNum = 0;
    const skuNumRe = new RegExp(`^${skuCode}(\\d+)$`, 'i');
    for (const p of existingSkus) {
      const match = p.sku?.match(skuNumRe);
      if (match) maxSkuNum = Math.max(maxSkuNum, parseInt(match[1], 10));
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const titleNum = maxTitleNum + i + 1;
      const name = `${titleCode}${String(titleNum).padStart(3, '0')}`; // e.g. SILKTHREADBANGLES001
      const slug = slugify(name, { lower: true });

      const skuNum = maxSkuNum + i + 1;
      const sku = `${skuCode}${String(skuNum).padStart(3, '0')}`; // e.g. MT001

      try {
        const slugTaken = await Product.findOne({ slug });
        if (slugTaken) {
          errors.push({ name, error: 'A product with this generated name/slug already exists — skipped' });
          continue;
        }

        const skuTaken = await Product.findOne({ sku });
        if (skuTaken) {
          errors.push({ name, error: `Generated SKU ${sku} already exists — skipped` });
          continue;
        }

        const variant = {
          color: '',
          colorHex: '#000000',
          images: [images[i]],
          price: Number(price),
          compareAtPrice: Number(compareAtPrice) || 0,
          sizes: sizeEntries.map((s) => ({ ...s })),
        };

        const product = await Product.create({
          name,
          slug,
          sku,
          description,
          category: cat._id,
          material: String(material || '').trim(),
          finish: String(finish || '').trim(),
          stoneType: String(stoneType || '').trim(),
          piecesInSet: piecesInSetClean,
          occasion: occasionClean,
          careInstructions: String(careInstructions || '').trim(),
          weight: Number(weight),
          tags,
          variants: [variant],
          basePrice: Number(price),
          isReadyToShip: !!isReadyToShip,
          sizeChart: sizeChartImages,
        });

        created.push({ id: product._id, name: product.name, sku: product.sku });
      } catch (err) {
        errors.push({ name, error: err.message });
      }
    }

    return NextResponse.json(
      { createdCount: created.length, created, errors },
      { status: created.length ? 201 : 400 }
    );
  } catch (err) {
    console.error('POST /api/products/bulk error:', err);
    return NextResponse.json({ error: err.message || 'Bulk upload failed' }, { status: 500 });
  }
});