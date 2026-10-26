'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import toast from 'react-hot-toast';
import { useCart, cartKey } from '@/components/CartContext';
import { formatINR } from '@/lib/utils';
import { INDIAN_STATES } from '@/lib/indianStates';

// Design tokens — keep in sync with the homepage, CartPage, ProductPage and Footer.
//   Primary    #C2185B  savings / free shipping, selected option, button hover
//   Secondary  #D4A017  thin divider (decorative only)
//   Background #FFFFFF  pure white page and cards
//   Text       #2D1028  headings + body, dark buttons
//   Accent     #F8D7E3  banner wash, focus ring
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const PAPER = '#FFFFFF';

const INK_SOFT = 'rgba(45, 16, 40, 0.72)';
const LINE = 'rgba(45, 16, 40, 0.12)';
const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

// Rounding scale: summary card 24px · banner + payment option 16px · inputs and buttons fully round.
const R_CARD = '24px';
const R_MD = '16px';

const inputClass =
  'w-full text-sm font-medium outline-none transition-all px-5 py-3 bg-white text-[#2D1028] ' +
  'border border-[#2D1028]/20 rounded-full placeholder:text-[#2D1028]/50 placeholder:font-medium ' +
  'focus:border-[#C2185B] focus:ring-4 focus:ring-[#F8D7E3]';

const sectionHeadClass = 'text-lg font-bold mb-4';

function SSRKInput({ placeholder, type = 'text', value, onChange, autoComplete, inputMode, maxLength }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      value={value}
      onChange={onChange}
      className={inputClass}
    />
  );
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart, updateQty, removeItem, setItemStock } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    line1: '', line2: '', city: '', state: '', pincode: '', landmark: ''
  });
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [submitting, setSubmitting] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);

  const [shipping, setShipping] = useState(null);
  const [freeShippingAbove, setFreeShippingAbove] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const discountedSubtotal = subtotal - discount;
  const total = shipping !== null ? Math.round(discountedSubtotal + shipping) : null;

  // Total piece count across the cart — sent as a fallback; the server
  // normally computes weight from each product's own weight (grams).
  const totalQty = items.reduce((sum, i) => sum + (i.qty || 0), 0);

  const fetchShipping = useCallback(async () => {
    setShippingLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtotal: discountedSubtotal,
          totalQty,
          // State selects the admin's state-wise shipping rate.
          state: form.state,
          // The server looks up each product's weight from these lines.
          items: items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            isCombo: i.isCombo || false,
            comboId: i.comboId
          }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShipping(data.shippingCost);
        setFreeShippingAbove(data.freeShippingAbove);
      } else {
        toast.error(data.error || 'Could not calculate shipping');
      }
    } catch {
      toast.error('Could not calculate shipping');
    } finally {
      setShippingLoading(false);
    }
  }, [discountedSubtotal, totalQty, items, form.state]);

  useEffect(() => { fetchShipping(); }, [fetchShipping]);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon, subtotal })
    });
    const data = await res.json();
    if (data.valid) { setDiscount(data.discount); toast.success(data.message); }
    else { setDiscount(0); toast.error(data.message); }
  }

  async function validateStockBeforeOrder() {
    setCheckingStock(true);
    try {
      const res = await fetch('/api/cart/validate-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            size: i.size,
            qty: i.qty,
            name: i.name,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Could not verify stock, please try again');
        return false;
      }

      if (data.valid) return true;

      data.issues.forEach((issue) => {
        const key = cartKey(issue);
        if (issue.reason === 'unavailable' || issue.reason === 'out_of_stock') {
          toast.error(`${issue.name || 'An item'} is out of stock and was removed from your cart`);
          removeItem(key);
        } else if (issue.reason === 'insufficient_stock') {
          toast.error(`Only ${issue.availableStock} left of ${issue.name || 'an item'} — quantity adjusted`);
          updateQty(key, issue.availableStock);
          setItemStock(key, issue.availableStock);
        }
      });

      return false;
    } catch {
      toast.error('Could not verify stock, please try again');
      return false;
    } finally {
      setCheckingStock(false);
    }
  }

  async function placeOrder() {
    if (!form.name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      toast.error('Please fill all required fields'); return;
    }
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    if (shipping === null) { toast.error('Shipping is still being calculated, please wait'); return; }

    setSubmitting(true);

    const stockOk = await validateStockBeforeOrder();
    if (!stockOk) {
      setSubmitting(false);
      return;
    }

    const orderItems = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      size: i.size,
      sleeveType: i.sleeveType || '',
      zipType: i.zipType || '',
      qty: i.qty,
      isCombo: i.isCombo || false,
      comboId: i.comboId
    }));

    try {
      if (paymentMethod === 'razorpay') {
        // Server recomputes the total from orderItems and stashes the order
        // payload so the webhook can create the order even if this tab
        // closes before the handler below runs.
        // `expectedTotal` is only a safety check: if the server's total
        // differs from what the customer saw, the server answers 409 and
        // the Razorpay popup never opens with a wrong amount.
        const orderRes = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: orderItems,
            customer: { name: form.name, phone: form.phone, email: form.email },
            shippingAddress: form,
            couponCode: coupon,
            expectedTotal: total
          })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          toast.error(orderData.error || 'Payment gateway error');
          if (orderRes.status === 409) fetchShipping(); // refresh what the page shows
          setSubmitting(false);
          return;
        }

        const rzp = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: 'INR',
          name: 'Aara Creation',
          order_id: orderData.order.id,
          prefill: { name: form.name, contact: form.phone, email: form.email },
          theme: { color: PRIMARY },
          handler: async function (response) {
            // Fast path — if this fails or never runs, the webhook creates
            // the same order server-side. /api/orders is idempotent on
            // razorpayOrderId, so this is always safe to call.
            const finalRes = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: orderItems,
                customer: { name: form.name, phone: form.phone, email: form.email },
                shippingAddress: form,
                couponCode: coupon,
                paymentMethod: 'razorpay',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const finalData = await finalRes.json();
            if (finalRes.ok) {
              clearCart();
              router.push(`/order-success/${finalData.order._id}`);
            } else {
              // Payment already succeeded on Razorpay's side regardless —
              // the webhook will still create the order in the background.
              toast.error(
                `Payment received — confirming your order. If it doesn't appear shortly, contact support with payment ID ${response.razorpay_payment_id}.`,
                { duration: 8000 }
              );
              clearCart();
              router.push('/');
            }
            setSubmitting(false);
          },
          modal: { ondismiss: () => setSubmitting(false) }
        });
        rzp.open();
      } else {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: orderItems,
            customer: { name: form.name, phone: form.phone, email: form.email },
            shippingAddress: form,
            couponCode: coupon,
            paymentMethod: 'cod'
          })
        });
        const data = await res.json();
        if (res.ok) { clearCart(); router.push(`/order-success/${data.order._id}`); }
        else { toast.error(data.error || 'Could not place order'); }
        setSubmitting(false);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  const placeOrderDisabled = submitting || shippingLoading || checkingStock || shipping === null;

  // Only show the "add ₹X more for free shipping" banner when a free-shipping
  // threshold is actually configured (> 0) and the customer hasn't reached it.
  const amountToFreeShipping =
    freeShippingAbove !== null && freeShippingAbove > 0
      ? freeShippingAbove - discountedSubtotal
      : 0;
  const showFreeShippingBanner = shipping !== null && shipping > 0 && amountToFreeShipping > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-14" style={{ background: PAPER }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <h1 className="text-[24px] sm:text-[28px] font-bold" style={{ fontFamily: FONT_SERIF, color: INK }}>
        Checkout
      </h1>
      <div className="mt-3 mb-8 h-[2px] w-12 rounded-full" style={{ background: GOLD }} />

      {showFreeShippingBanner && (
        <div
          className="text-sm font-medium py-3 px-5 mb-8"
          style={{ background: ACCENT, color: INK, borderRadius: R_MD }}
        >
          Add <strong style={{ color: PRIMARY }}>{formatINR(amountToFreeShipping)}</strong> more to get{' '}
          <strong>free shipping</strong>
        </div>
      )}

      <div className="flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-12 md:items-start">

        {/* ── Left: shipping form ───────────────────────────────── */}
        <div>
          <h2 className={sectionHeadClass} style={{ fontFamily: FONT_SERIF, color: INK }}>Shipping details</h2>
          <div className="space-y-3">
            <SSRKInput placeholder="Full Name *" autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} />
            <SSRKInput placeholder="Phone Number *" type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            <SSRKInput placeholder="Email (optional)" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            <SSRKInput placeholder="Address Line 1 *" autoComplete="address-line1" value={form.line1} onChange={(e) => update('line1', e.target.value)} />
            <SSRKInput placeholder="Address Line 2" autoComplete="address-line2" value={form.line2} onChange={(e) => update('line2', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="City *"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
              />
              <select
                autoComplete="address-level1"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className={`${inputClass} ${form.state ? '' : 'text-[#2D1028]/50'}`}
              >
                <option value="">State *</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s} className="text-[#2D1028]">{s}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Pincode *"
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                value={form.pincode}
                onChange={(e) => update('pincode', e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Landmark"
                value={form.landmark}
                onChange={(e) => update('landmark', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ── Right: summary card (sticky on desktop) ───────────── */}
        <aside
          className="p-5 sm:p-6 md:sticky md:top-6"
          style={{
            background: PAPER,
            border: `1px solid ${LINE}`,
            borderRadius: R_CARD,
            boxShadow: '0 18px 40px rgba(45, 16, 40, 0.07)',
          }}
        >
          <h2 className={sectionHeadClass} style={{ fontFamily: FONT_SERIF, color: INK }}>Order summary</h2>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm font-medium py-1 gap-2" style={{ color: INK_SOFT }}>
                <span className="truncate">
                  {i.name} ({[i.color, i.size, i.sleeveType, i.zipType].filter(Boolean).join('/')}) ×{i.qty}
                </span>
                <span className="shrink-0 font-bold" style={{ color: INK }}>{formatINR(i.price * i.qty)}</span>
              </div>
            ))}
          </div>

          {/* <div className="flex gap-2 mt-4">
            <input
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
              className={`${inputClass} flex-1`}
            />
            <button
              onClick={applyCoupon}
              className="px-5 text-sm font-bold shrink-0 rounded-full transition-colors hover:bg-[#F8D7E3]"
              style={{ border: `1px solid ${PRIMARY}`, color: INK, background: PAPER }}
            >
              Apply
            </button>
          </div> */}

          <div style={{ height: '1px', background: LINE }} className="my-4" />

          <div className="space-y-1.5 text-sm font-medium">
            <div className="flex justify-between" style={{ color: INK_SOFT }}>
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-bold" style={{ color: PRIMARY }}>
                <span>Discount</span>
                <span>−{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ color: INK_SOFT }}>
              <span>Shipping</span>
              <span>
                {shippingLoading
                  ? <span style={{ opacity: 0.6 }}>Calculating…</span>
                  : shipping === 0
                    ? <span style={{ color: PRIMARY, fontWeight: 700 }}>Free</span>
                    : shipping !== null
                      ? formatINR(shipping)
                      : <span style={{ opacity: 0.6 }}>—</span>
                }
              </span>
            </div>
          </div>

          <div className="flex justify-between items-baseline mt-3 pt-3 text-base" style={{ borderTop: `1px solid ${INK}` }}>
            <span className="font-bold" style={{ color: INK }}>Total</span>
            <span className="text-xl font-bold" style={{ color: INK, fontFamily: FONT_SERIF }}>{total !== null ? formatINR(total) : '—'}</span>
          </div>

          {/* Payment method */}
          <div className="mt-6">
            <h2 className={sectionHeadClass} style={{ fontFamily: FONT_SERIF, color: INK }}>Payment method</h2>
            <label
              className="flex items-center gap-3 text-sm font-bold cursor-pointer px-5 py-3.5"
              style={{
                color: INK,
                background: paymentMethod === 'razorpay' ? ACCENT : PAPER,
                border: `1px solid ${paymentMethod === 'razorpay' ? PRIMARY : LINE}`,
                borderRadius: R_MD,
              }}
            >
              <input
                type="radio"
                checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')}
                className="w-4 h-4"
                style={{ accentColor: PRIMARY }}
              />
              Pay Online (Cards / UPI / Netbanking)
            </label>
          </div>

          <button
            onClick={placeOrder}
            disabled={placeOrderDisabled}
            className="w-full mt-6 py-3.5 text-sm font-bold rounded-full border transition-all
                       bg-[#2D1028] text-white border-[#2D1028]
                       hover:bg-[#C2185B] hover:border-[#C2185B] hover:shadow-[0_10px_24px_rgba(194,24,91,0.25)]
                       active:scale-[0.98]
                       disabled:bg-[#2D1028]/10 disabled:border-[#2D1028]/10 disabled:text-[#2D1028]/50 disabled:shadow-none disabled:cursor-not-allowed
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2185B]"
          >
            {submitting
              ? (checkingStock ? 'Checking stock…' : 'Placing Order…')
              : shippingLoading
                ? 'Calculating shipping…'
                : total !== null
                  ? `Place Order — ${formatINR(total)}`
                  : 'Place Order'
            }
          </button>
        </aside>
      </div>
    </div>
  );
}