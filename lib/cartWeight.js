import mongoose from 'mongoose';
import Product from '@/models/Product';
import Combo from '@/models/Combo';

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

// Total cart weight in grams, from each product's own weight.
// Products with no weight fall back to `defaultWeight` (Settings.weightPerPiece).
// A combo weighs the sum of its products (1 piece of each per combo).
// Shared by the shipping-estimate route and buildOrderItemsAndTotals.
export async function getCartWeightGrams(items, defaultWeight = 0) {
  let total = 0;
  const pieceWeight = (p) => (Number(p?.weight) > 0 ? Number(p.weight) : defaultWeight);

  for (const item of items || []) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;

    if (item.isCombo === true && item.comboId) {
      if (!isId(item.comboId)) continue;
      const combo = await Combo.findById(item.comboId).lean();
      if (!combo) continue;
      let comboWeight = 0;
      for (const sub of combo.products || []) {
        const p = await Product.findById(sub.product).select('weight').lean();
        comboWeight += pieceWeight(p);
      }
      total += comboWeight * qty;
      continue;
    }

    if (!isId(item.productId)) continue;
    const product = await Product.findById(item.productId).select('weight').lean();
    if (!product) continue;
    total += pieceWeight(product) * qty;
  }
  return total;
}