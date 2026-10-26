import mongoose from 'mongoose';

// Holds the full order payload between "Razorpay order created" and "order
// actually saved". Also stores the exact total/shipping that was charged so
// the final order always matches the payment. Auto-expires after 24h.
const PendingOrderSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true },
  items: { type: mongoose.Schema.Types.Mixed, required: true },
  customer: { type: mongoose.Schema.Types.Mixed, required: true },
  shippingAddress: { type: mongoose.Schema.Types.Mixed, required: true },
  couponCode: { type: String, default: '' },
  total: { type: Number },        // ₹ charged via Razorpay
  shippingFee: { type: Number },  // ₹ shipping included in that total
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }
});

export default mongoose.models.PendingOrder || mongoose.model('PendingOrder', PendingOrderSchema);