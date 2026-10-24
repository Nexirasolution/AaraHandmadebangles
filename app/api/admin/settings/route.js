export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { requireAdmin } from '@/lib/apiAuth';
import { calculateShipping } from '@/lib/shipping';
import { getCartWeightGrams } from '@/lib/cartWeight';
import { INDIAN_STATES } from '@/lib/indianStates';

// Keep only valid, de-duplicated state rules with non-negative numbers, so a
// bad/stale client can't store junk that silently breaks shipping.
function cleanStateShipping(list) {
  if (!Array.isArray(list)) return [];
  const allowed = new Map(INDIAN_STATES.map((s) => [s.toLowerCase(), s]));
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const canonical = allowed.get(String(r?.state || '').trim().toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push({
      state: canonical,
      pricePerKg: Math.max(0, Number(r.pricePerKg) || 0),
      freeShippingAbove: Math.max(0, Number(r.freeShippingAbove) || 0)
    });
  }
  return out;
}

export async function GET() {
  await dbConnect();
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) settings = await Settings.create({ key: 'global' });
  return NextResponse.json({ settings });
}

export const PUT = requireAdmin(async (req) => {
  await dbConnect();
  const body = await req.json();
  const update = { ...body };
  if ('stateShipping' in body) update.stateShipping = cleanStateShipping(body.stateShipping);
  const settings = await Settings.findOneAndUpdate({ key: 'global' }, update, { new: true, upsert: true });
  return NextResponse.json({ settings });
});

// POST /api/admin/settings — used by checkout to calculate shipping.
// Body: { subtotal, totalQty, state, items: [{ productId, qty, isCombo, comboId }] }
//   subtotal — cart subtotal in ₹ (after discount), used only to check the
//              free-shipping threshold.
//   items    — cart lines; the server looks up each product's own weight
//              (grams) to compute the order's total weight.
//   state    — customer's state; selects the admin's state-wise rate
//              (global rates are used if no rule exists for it).
//   totalQty — fallback only: if `items` is missing, weight is estimated as
//              totalQty × Settings.weightPerPiece.
//
// The calculation lives in lib/shipping.js and is shared with
// buildOrderItemsAndTotals, so the checkout page and the Razorpay amount
// always agree.
export async function POST(req) {
  try {
    const { subtotal, totalQty, items, state } = await req.json();

    await dbConnect();
    const settings = await Settings.findOne({ key: 'global' }).lean();
    if (!settings) {
      return NextResponse.json({ error: 'Settings not configured' }, { status: 500 });
    }

    const totalWeightGrams = Array.isArray(items)
      ? await getCartWeightGrams(items, Number(settings.weightPerPiece) || 0)
      : undefined;

    return NextResponse.json(
      calculateShipping(settings, { subtotal, totalQty, totalWeightGrams, state })
    );
  } catch (err) {
    console.error('Shipping calculate error:', err);
    return NextResponse.json({ error: 'Could not calculate shipping' }, { status: 500 });
  }
}