// Stock helpers shared by the storefront, order calculation and order creation.
//
// Variant stock model (see models/Product.js):
//   - Variant WITH sizes     -> stock lives on each size entry (variant.sizes[].stock)
//   - Variant WITHOUT sizes  -> variant.stock; if it is unset (undefined/null)
//                               stock is NOT tracked, i.e. unlimited.

function hasStockNumber(value) {
  return value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
}

// Used by orderCalc.js / createOrder.js.
// Returns { found, stock, hasSizes, tracked, sku }
//   found    - false when the requested size doesn't exist on a sized variant
//   stock    - sellable units (Infinity when stock isn't tracked)
//   hasSizes - variant has size entries
//   tracked  - stock is a real counter that should be decremented
//   sku      - per-size SKU when present
export function resolveStock(variant, size) {
  if (!variant) {
    return { found: false, stock: 0, hasSizes: false, tracked: false, sku: '' };
  }

  const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];

  if (sizes.length > 0) {
    const entry = sizes.find((s) => s.size === size);
    if (!entry) {
      return { found: false, stock: 0, hasSizes: true, tracked: true, sku: '' };
    }
    return {
      found: true,
      stock: Math.max(0, Number(entry.stock) || 0),
      hasSizes: true,
      tracked: true,
      sku: entry.sku || '',
    };
  }

  // No sizes: variant-level stock (unset = untracked / unlimited).
  if (hasStockNumber(variant.stock)) {
    return {
      found: true,
      stock: Math.max(0, Number(variant.stock)),
      hasSizes: false,
      tracked: true,
      sku: '',
    };
  }
  return { found: true, stock: Infinity, hasSizes: false, tracked: false, sku: '' };
}

// Used by ProductCard.jsx for the "Out of stock" / "N left" badges.
// Total sellable units for one variant:
//   - sized variant              -> sum of all size stocks
//   - no sizes, stock set        -> that number
//   - no sizes, stock not set    -> Infinity (not tracked)
// Compare it (> 0, <= 5); only print it after checking Number.isFinite().
export function getVariantTotalStock(variant) {
  if (!variant) return 0;
  const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
  if (sizes.length > 0) {
    return sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
  }
  if (!hasStockNumber(variant.stock)) return Infinity;
  return Math.max(0, Number(variant.stock));
}