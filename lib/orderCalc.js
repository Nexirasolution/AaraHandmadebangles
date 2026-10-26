import mongoose from 'mongoose';
import Product from '@/models/Product';
import Combo from '@/models/Combo';
import Coupon from '@/models/Coupon';
import Settings from '@/models/Settings';
import { genCouponCheck } from '@/lib/utils';
import { calculateShipping } from '@/lib/shipping';
import { getCartWeightGrams } from '@/lib/cartWeight';
import { resolveStock } from '@/lib/stock';

export class OrderError extends Error {}

// Pure read-only pricing + validation. Does NOT touch stock or coupon usage.
// `state` selects the admin's state-wise shipping rule.
export async function buildOrderItemsAndTotals(items, couponCode, state = '') {
  let subtotal = 0;
  const orderItems = [];
  const stockUpdateItems = [];

  for (const item of items) {
    // ── Combo line ──────────────────────────────────────────────
    if (item.isCombo === true && item.comboId) {
      if (!mongoose.Types.ObjectId.isValid(item.comboId)) continue;

      const combo = await Combo.findById(item.comboId);
      if (!combo || !combo.isActive) {
        throw new OrderError('This combo is no longer available');
      }

      const comboLines = [];
      for (const sub of combo.products) {
        const subProduct = await Product.findById(sub.product);
        const subVariant = subProduct?.variants.id(sub.variantId);
        if (!subProduct || !subVariant) {
          throw new OrderError(`Combo "${combo.name}" is out of stock`);
        }
        const st = resolveStock(subVariant, sub.size);
        if (!st.found || st.stock < item.qty) {
          throw new OrderError(`Combo "${combo.name}" is out of stock`);
        }
        comboLines.push({
          productId: sub.product,
          variantId: sub.variantId,
          size: sub.size,
          hasSizes: st.hasSizes,
          tracked: st.tracked
        });
      }

      subtotal += combo.comboPrice * item.qty;
      orderItems.push({
        product: null,
        comboId: combo._id,
        name: combo.name,
        sku: combo.sku || '',
        image: combo.image || '',
        color: '',
        size: '',
        price: combo.comboPrice,
        qty: item.qty,
        isCombo: true
      });
      stockUpdateItems.push({ isCombo: true, comboLines, qty: item.qty });
      continue;
    }

    // ── Normal product line ─────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(item.productId) || !mongoose.Types.ObjectId.isValid(item.variantId)) {
      continue;
    }

    const product = await Product.findById(item.productId);
    if (!product) continue;
    const variant = product.variants.id(item.variantId);
    if (!variant) continue;

    // Works with or without sizes — a size is only required when the
    // variant actually has sizes.
    const st = resolveStock(variant, item.size);
    if (!st.found || st.stock < item.qty) {
      const label = [variant.color, st.hasSizes ? item.size : ''].filter(Boolean).join(', ');
      throw new OrderError(`${product.name}${label ? ` (${label})` : ''} is out of stock`);
    }

    // The price is always read from the database, never trusted from the cart.
    const unitPrice = variant.price;

    subtotal += unitPrice * item.qty;
    orderItems.push({
      product: product._id,
      name: product.name,
      sku: st.sku || product.sku || '',
      image: variant.images?.[0] || '',
      color: variant.color,
      size: st.hasSizes ? item.size : '',
      sleeveType: item.sleeveType || '',
      zipType: item.zipType || '',
      price: unitPrice,
      qty: item.qty
    });
    stockUpdateItems.push({
      isCombo: false,
      productId: item.productId,
      variantId: item.variantId,
      size: st.hasSizes ? item.size : '',
      hasSizes: st.hasSizes,
      tracked: st.tracked,
      qty: item.qty
    });
  }

  if (!orderItems.length) throw new OrderError('No valid items in cart');

  let discount = 0;
  let appliedCoupon = '';
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: genCouponCheck(couponCode), isActive: true });
    if (coupon && subtotal >= (coupon.minOrderValue || 0)) {
      if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
        if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
          discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
          appliedCoupon = coupon.code;
        }
      }
    }
  }

  // Same shipping function as the checkout estimate route.
  const settings = await Settings.findOne({ key: 'global' }).lean();
  const totalQty = orderItems.reduce((sum, i) => sum + (i.qty || 0), 0);
  const totalWeightGrams = await getCartWeightGrams(items, Number(settings?.weightPerPiece) || 0);
  const discountedSubtotal = subtotal - discount;
  const { shippingCost: shippingFee } = calculateShipping(settings, {
    subtotal: discountedSubtotal,
    totalQty,
    totalWeightGrams,
    state
  });
  const total = Math.round(discountedSubtotal + shippingFee);

  return { orderItems, stockUpdateItems, subtotal, discount, appliedCoupon, shippingFee, total };
}