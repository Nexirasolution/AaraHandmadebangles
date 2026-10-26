// Stock lookup that works for products WITH sizes and products WITHOUT sizes.
//  - variant.sizes has entries -> stock lives on the matching size entry.
//  - variant.sizes is empty    -> no size needed; uses variant.stock if it is
//    a number, otherwise stock is untracked (unlimited = Infinity).

export function variantHasSizes(variant) {
  return Array.isArray(variant?.sizes) && variant.sizes.length > 0;
}

export function resolveStock(variant, size) {
  if (variantHasSizes(variant)) {
    const entry = variant.sizes.find((s) => s.size === size);
    return {
      hasSizes: true,
      tracked: true,
      found: !!entry,
      stock: entry ? Number(entry.stock) || 0 : 0,
      sku: entry?.sku || ''
    };
  }

  const tracked = typeof variant?.stock === 'number';
  return {
    hasSizes: false,
    tracked,
    found: true,
    stock: tracked ? variant.stock : Infinity,
    sku: ''
  };
}

// Used by the storefront. Returns a number (Infinity = unlimited).
//  - no variant                       -> 0
//  - variant has sizes, none picked   -> Infinity (no cap until a size is picked)
//  - variant has sizes, size picked   -> that size's stock
//  - variant has no sizes             -> variant.stock, or Infinity if untracked
export function getSizeStock(variant, size) {
  if (!variant) return 0;
  const r = resolveStock(variant, size);
  if (r.hasSizes && !size) return Infinity;
  return r.stock;
}