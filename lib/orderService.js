import crypto from 'crypto';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import PendingOrder from '@/models/PendingOrder';
import { genOrderNumber } from '@/lib/utils';
import { buildOrderItemsAndTotals, OrderError } from '@/lib/orderCalc';

// Shared by the client "fast path" (/api/orders) and the Razorpay webhook.
// Idempotent on razorpayOrderId.
//
// opts.skipSignatureVerification: true when called from the webhook.

async function decrementStock(line, qty) {
  if (line.hasSizes) {
    await Product.updateOne(
      { _id: line.productId, 'variants._id': line.variantId, 'variants.sizes.size': line.size },
      { $inc: { 'variants.$[v].sizes.$[s].stock': -qty, soldCount: qty } },
      { arrayFilters: [{ 'v._id': line.variantId }, { 's.size': line.size }] }
    );
  } else if (line.tracked) {
    await Product.updateOne(
      { _id: line.productId, 'variants._id': line.variantId },
      { $inc: { 'variants.$.stock': -qty, soldCount: qty } }
    );
  } else {
    // Sizeless + untracked stock: only bump the sold counter.
    await Product.updateOne({ _id: line.productId }, { $inc: { soldCount: qty } });
  }
}

export async function createOrderIdempotent(payload, opts = {}) {
  const {
    items, customer, shippingAddress, couponCode, paymentMethod,
    razorpayOrderId, razorpayPaymentId, razorpaySignature
  } = payload;

  if (!items?.length) throw new OrderError('Cart is empty');
  if (!customer?.name || !customer?.phone) throw new OrderError('Name and phone are required');

  if (razorpayOrderId) {
    const existing = await Order.findOne({ razorpayOrderId });
    if (existing) return { order: existing, created: false };
  }

  let pending = null;
  if (paymentMethod === 'razorpay') {
    if (!razorpayOrderId || !razorpayPaymentId) {
      throw new OrderError('Missing Razorpay payment identifiers');
    }
    if (!opts.skipSignatureVerification) {
      if (!razorpaySignature) throw new OrderError('Missing payment verification data');
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      if (expected !== razorpaySignature) throw new OrderError('Payment verification failed');
    }
    pending = await PendingOrder.findOne({ razorpayOrderId }).lean();
  }

  // Always use the state the customer paid with (payload first, then the
  // stashed pending order) so shipping matches what was charged.
  const state = shippingAddress?.state || pending?.shippingAddress?.state || '';

  const calc = await buildOrderItemsAndTotals(items, couponCode, state);
  const { orderItems, stockUpdateItems, subtotal, discount, appliedCoupon } = calc;
  let { shippingFee, total } = calc;

  // For online payments the order must show exactly what Razorpay charged.
  if (pending && Number.isFinite(pending.total) && pending.total > 0) {
    total = pending.total;
    if (Number.isFinite(pending.shippingFee)) shippingFee = pending.shippingFee;
  }

  let order;
  try {
    order = await Order.create({
      orderNumber: genOrderNumber(),
      items: orderItems,
      customer,
      shippingAddress,
      subtotal,
      discount,
      couponCode: appliedCoupon,
      shippingFee,
      total,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'razorpay' ? 'paid' : 'pending',
      razorpayOrderId,
      razorpayPaymentId
    });
  } catch (err) {
    if (err.code === 11000 && razorpayOrderId) {
      const existing = await Order.findOne({ razorpayOrderId });
      if (existing) return { order: existing, created: false };
    }
    throw err;
  }

  if (appliedCoupon) {
    await Coupon.updateOne({ code: appliedCoupon }, { $inc: { usedCount: 1 } });
  }

  for (const entry of stockUpdateItems) {
    if (entry.isCombo) {
      for (const line of entry.comboLines) {
        await decrementStock(line, entry.qty);
      }
      continue;
    }
    await decrementStock(entry, entry.qty);
  }

  return { order, created: true };
}