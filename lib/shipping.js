// Single source of truth for shipping.
// Used by BOTH:
//   - POST /api/admin/settings   (checkout page shipping estimate)
//   - buildOrderItemsAndTotals   (amount charged through Razorpay / stored on the order)
// so the total shown on the checkout page and the amount Razorpay charges
// can never disagree.
//
// Rules:
//   1. Total weight = totalWeightGrams if the caller supplied it (sum of each
//      product's own weight, see lib/cartWeight.js). Otherwise estimate it as
//      totalQty * Settings.weightPerPiece.
//   2. Rates come from the customer's STATE when the admin has set a rule for
//      it in Settings.stateShipping; otherwise the global rates are used.
//        - pricePerKg:        state rule if > 0, else global pricePerKg
//        - freeShippingAbove: state rule if > 0, else global freeShippingAbove
//   3. If pricePerKg > 0 AND weight > 0 -> weight-based:
//        billable kg = ceil(weight / 1000), minimum 1 kg
//        cost = billable kg * pricePerKg
//   4. Otherwise fall back to the flat defaultShippingCharge.
//   5. If freeShippingAbove > 0 and subtotal >= freeShippingAbove -> free.
//      A threshold of 0 / unset means "free shipping disabled".

const norm = (s) => String(s || '').trim().toLowerCase();

export function findStateRule(settings, state) {
  const key = norm(state);
  if (!key || !Array.isArray(settings?.stateShipping)) return null;
  return settings.stateShipping.find((r) => norm(r.state) === key) || null;
}

export function calculateShipping(settings, { subtotal, totalQty, totalWeightGrams, state }) {
  const rule = findStateRule(settings, state);

  const weightPerPiece = Number(settings?.weightPerPiece) || 0; // fallback grams
  const globalPricePerKg = Number(settings?.pricePerKg) || 0;
  const globalFreeAbove = Number(settings?.freeShippingAbove) || 0;
  const defaultShippingCharge = Number(settings?.defaultShippingCharge) || 0;
  const qty = Number(totalQty) || 0;

  const pricePerKg = Number(rule?.pricePerKg) > 0 ? Number(rule.pricePerKg) : globalPricePerKg;
  const freeShippingAbove =
    Number(rule?.freeShippingAbove) > 0 ? Number(rule.freeShippingAbove) : globalFreeAbove;

  // Prefer the real per-product weight; only estimate from qty if the caller
  // didn't supply one.
  const weightGrams =
    totalWeightGrams !== undefined && totalWeightGrams !== null
      ? Number(totalWeightGrams) || 0
      : qty * weightPerPiece;

  const weightConfigured = pricePerKg > 0 && weightGrams > 0;

  let billableKg = 0;
  let baseCost;

  if (weightConfigured) {
    billableKg = Math.max(1, Math.ceil(weightGrams / 1000));
    baseCost = billableKg * pricePerKg;
  } else {
    baseCost = defaultShippingCharge;
  }

  const isFree = freeShippingAbove > 0 && Number(subtotal) >= freeShippingAbove;

  return {
    shippingCost: isFree ? 0 : baseCost,
    freeShippingAbove,
    weightPerPiece,
    pricePerKg,
    defaultShippingCharge,
    totalWeightGrams: weightGrams,
    billableKg,
    usedFallback: !weightConfigured,
    state: state || '',
    usedStateRule: !!rule
  };
}