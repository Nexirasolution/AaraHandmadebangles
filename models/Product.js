import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema(
  {
    // Colour / shade of the piece (e.g. "Maroon", "Emerald Green").
    color: { type: String, default: '' },
    colorHex: { type: String, default: '#000000' },
    images: [{ type: String }],
    price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: 0 },

    // Stock for variants that have NO sizes (leave `sizes` empty).
    // Not set = stock is not tracked (unlimited). Set a number to track it.
    // Ignored when the variant has size entries (stock lives on each size).
    stock: { type: Number, min: 0, default: undefined },

    // `size` is the bangle size ("2.2", "2.4", "2.6", "2.8", "2.10") or
    // "Free Size" for adjustable pieces (necklaces, earrings, kadas, rings).
    // Leave this array empty for products that have no size at all.
    sizes: [
      {
        size: { type: String, required: true },
        stock: { type: Number, default: 0 },
        sku: { type: String }
      }
    ]
  },
  { _id: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

    // ── Jewellery attributes (all optional; shown on the product page) ──
    // Base material, e.g. "Silk Thread", "Lac", "Brass".
    material: { type: String, default: '', trim: true },
    // Finish / plating, e.g. "Gold Plated", "Oxidised".
    finish: { type: String, default: '', trim: true },
    // Stone or decorative work, e.g. "Kundan", "Pearls".
    stoneType: { type: String, default: '', trim: true },
    // How many pieces come in one purchase unit (a set of 4 bangles = 4).
    piecesInSet: { type: Number, default: 1, min: 1 },
    // Occasions this piece suits: Daily Wear, Festive, Wedding, ...
    occasion: [{ type: String }],
    // Free-text care instructions shown on the product page.
    careInstructions: { type: String, default: '' },

    // Shipping weight of ONE purchase unit (one piece / set / pair) in
    // grams. Used to compute order weight for shipping. 0 = not set →
    // falls back to Settings.weightPerPiece.
    weight: { type: Number, default: 0, min: 0 },

    tags: [{ type: String }],
    variants: [VariantSchema],

    // One or more optional size-guide images (e.g. how to measure your
    // bangle size). If empty, the storefront falls back to this product's
    // category.sizeChart instead.
    sizeChart: [{ type: String }],

    // One or more optional product videos (e.g. a wrist-show or sparkle
    // clip). Shown on the storefront PDP below the image gallery. Uploaded
    // through the same /api/upload endpoint as images — Cloudinary's
    // resource_type: 'auto' detects and stores it as a video asset.
    videos: [{ type: String }],

    // When true, the storefront shows a highlighted "Ready to Ship" badge
    // below the product title.
    isReadyToShip: { type: Boolean, default: false },

    basePrice: { type: Number, required: true }, // used for listing/sorting
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isBestSeller: { type: Boolean, default: false },
    isTopSeller: { type: Boolean, default: false },
    isActiveSeller: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
    seoTitle: String,
    seoDescription: String
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);