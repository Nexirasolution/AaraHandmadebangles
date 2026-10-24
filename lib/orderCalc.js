import mongoose from 'mongoose';
import Product from '@/models/Product';
import Combo from '@/models/Combo';
import Coupon from '@/models/Coupon';
import Settings from '@/models/Settings';
import { genCouponCheck } from '@/lib/utils';
import { calculateShipping } from '@/lib/shipping';
import { getCartWeightGrams } from '@/lib/cartWeight';

export class OrderError extends Error {}

// Pure read-only pricing + validation. Does NOT touch stock or coupon usage —
// safe to call twice (once for the Razorpay amount, once at final order creation).
// `state` is the customer's shipping-address state; it selects the admin's
// state-wise shipping rule (falls back to the global rates if none).
export async function buildOrderItemsAndTotals(items, couponCode, state = '') {
  let subtotal = 0;
  const orderItems = [];
  const stockUpdateItems = [];

  for (const item of items) {
    if (item.isCombo === true && item.comboId) {
      if (!mongoose.Types.ObjectId.isValid(item.comboId)) continue;

      const combo = await Combo.findById(item.comboId);
      if (!combo || !combo.isActive) {
        throw new OrderError(`This combo is no longer available`);
      }

      for (const sub of combo.products) {
        const subProduct = await Product.findById(sub.product);
        const subVariant = subProduct?.variants.id(sub.variantId);
        const subSizeEntry = subVariant?.sizes.find((s) => s.size === sub.size);
        if (!subProduct || !subVariant || !subSizeEntry || subSizeEntry.stock < item.qty) {
          throw new OrderError(`Combo "${combo.name}" is out of stock`);
        }
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
      stockUpdateItems.push({ isCombo: true, comboProducts: combo.products, qty: item.qty });
      continue;
    }

    if (!mongoose.Types.ObjectId.isValid(item.productId) || !mongoose.Types.ObjectId.isValid(item.variantId)) {
      continue;
    }

    const product = await Product.findById(item.productId);
    if (!product) continue;
    const variant = product.variants.id(item.variantId);
    if (!variant) continue;
    const sizeEntry = variant.sizes.find((s) => s.size === item.size);
    if (!sizeEntry || sizeEntry.stock < item.qty) {
      const label = [variant.color, item.size].filter(Boolean).join(', ');
      throw new OrderError(`${product.name}${label ? ` (${label})` : ''} is out of stock`);
    }

    // The price is always read from the database, never trusted from the cart.
    const unitPrice = variant.price;

    subtotal += unitPrice * item.qty;
    orderItems.push({
      product: product._id,
      name: product.name,
      sku: sizeEntry.sku || product.sku || '',
      image: variant.images?.[0] || '',
      color: variant.color,
      size: item.size,
      price: unitPrice,
      qty: item.qty
    });
    stockUpdateItems.push({
      isCombo: false,
      productId: item.productId,
      variantId: item.variantId,
      size: item.size,
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

  // Shipping uses the SAME function as the checkout page's estimate route
  // (POST /api/admin/settings), so both always produce the same number.
  // Weight comes from each product's own `weight` (grams); products with no
  // weight set fall back to Settings.weightPerPiece.
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