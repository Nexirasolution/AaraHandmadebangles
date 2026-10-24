'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Package, Phone, Truck, Star, X, Loader2, ImagePlus, CheckCircle2 } from 'lucide-react';
import { formatINR } from '@/lib/utils';

// Design tokens — keep in sync with the homepage, ProductPage, Footer and BulkEnquiryPage.
//   Primary    #C2185B  status highlights, icons, stars, focus, button hover
//   Secondary  #D4A017  thin dividers (decorative only)
//   Background #FFFFFF  pure white page and cards
//   Text       #2D1028  headings + body, dark buttons
//   Accent     #F8D7E3  soft badges, focus ring
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const PAPER = '#FFFFFF';

const GREY = 'rgba(45, 16, 40, 0.72)';      // secondary text
const GREY_WASH = 'rgba(45, 16, 40, 0.07)'; // neutral badge background
const LINE = 'rgba(45, 16, 40, 0.12)';      // hairlines
const INPUT_LINE = 'rgba(45, 16, 40, 0.18)';
const GOLD_LINE = 'rgba(212, 160, 23, 0.55)'; // thin decorative divider
const ALERT = '#A33A2B';                    // errors and cancelled only, so they still read as problems
const ALERT_WASH = '#FBECE9';
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

// Rounding scale: cards 20px · thumbnails + review box 12–16px · inputs, buttons, badges fully round.
const R_LG = '20px';
const R_MD = '12px';

const STATUS_STYLES = {
  placed:    { color: GREY,  background: GREY_WASH },
  confirmed: { color: INK,   background: ACCENT },
  packed:    { color: INK,   background: ACCENT, border: `1px solid rgba(194, 24, 91, 0.35)` },
  shipped:   { color: PAPER, background: PRIMARY },
  delivered: { color: PAPER, background: INK },
  cancelled: { color: ALERT, background: ALERT_WASH },
  returned:  { color: GREY,  background: GREY_WASH },
};

const KEEP_COLORS = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };

// Dark pill, turns primary pink on hover — same as the other pages.
const BTN_PRIMARY =
  'rounded-full transition-colors active:opacity-80 disabled:opacity-50 bg-[#2D1028] text-white border border-[#2D1028] hover:bg-[#C2185B] hover:border-[#C2185B]';

const INPUT_FOCUS =
  'outline-none transition-all focus:border-[#C2185B] focus:ring-4 focus:ring-[#F8D7E3] placeholder:text-[#2D1028]/50 placeholder:font-medium';

function ReviewForm({ order, item, phone, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        const url = data.url || data.secure_url;
        if (url) urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, productId: item.product, rating, comment, images })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Thanks for your review!');
        onDone();
      } else {
        toast.error(data.error || 'Could not submit review');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 mt-2.5" style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: R_LG }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold" style={{ color: INK }}>Rate {item.name}</span>
        <button
          onClick={onDone}
          type="button"
          aria-label="Close review form"
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:bg-[#F8D7E3]"
        >
          <X size={14} strokeWidth={2} style={{ color: INK }} />
        </button>
      </div>
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} star${i ? 's' : ''}`}>
            <Star
              size={20}
              strokeWidth={1.75}
              style={{ color: PRIMARY, fill: i < rating ? PRIMARY : 'transparent' }}
            />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        placeholder="How was the product?"
        className={`w-full text-sm font-medium mb-3 px-4 py-2.5 resize-none ${INPUT_FOCUS}`}
        style={{ border: `1px solid ${INPUT_LINE}`, borderRadius: '16px', color: INK, background: PAPER }}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 mb-3.5">
        {images.map((url, i) => (
          <img key={i} src={url} alt="" className="w-12 h-12 object-cover" style={{ borderRadius: R_MD, border: `1px solid ${LINE}` }} />
        ))}
        <label
          className="w-12 h-12 flex items-center justify-center cursor-pointer transition-colors hover:bg-[#F8D7E3]"
          style={{ border: `1px dashed rgba(194, 24, 91, 0.55)`, borderRadius: R_MD, color: PRIMARY, background: PAPER }}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} strokeWidth={1.75} />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        className={`text-xs font-bold px-5 py-2.5 ${BTN_PRIMARY}`}
        style={{ ...KEEP_COLORS }}
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}

export default function OrdersPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewedMap, setReviewedMap] = useState({});
  const [openReview, setOpenReview] = useState(null);

  async function fetchReviewedMap(orderList) {
    const map = {};
    await Promise.all(
      orderList
        .filter((o) => o.status === 'delivered')
        .map(async (o) => {
          const res = await fetch(`/api/reviews?orderId=${o._id}`);
          const data = await res.json();
          map[o._id] = new Set(data.reviewedProductIds || []);
        })
    );
    setReviewedMap(map);
  }

  async function handleLookup(e) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setLoading(true);
    setOrders(null);
    try {
      const res = await fetch('/api/orders/by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      setOrders(data.orders || []);
      fetchReviewedMap(data.orders || []);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function markReviewed(orderId, productId) {
    setReviewedMap((prev) => {
      const next = { ...prev };
      next[orderId] = new Set([...(next[orderId] || []), productId]);
      return next;
    });
    setOpenReview(null);
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-5 py-10 sm:py-14 min-h-[60vh]" style={{ background: PAPER }}>
      <div className="mb-7 pb-6" style={{ borderBottom: `1px solid ${GOLD_LINE}` }}>
        <h1 className="text-[24px] sm:text-[28px] font-bold mb-1.5" style={{ fontFamily: FONT_SERIF, color: INK }}>
          My Orders
        </h1>
        <p className="text-sm font-medium" style={{ color: GREY }}>
          Enter the phone number you used at checkout to view your orders.
        </p>
      </div>

      <form onSubmit={handleLookup} className="flex gap-2 mb-2">
        <div className="flex-1 min-w-0 relative">
          <Phone size={15} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: PRIMARY }} />
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit phone number"
            maxLength={10}
            className={`w-full pl-10 pr-4 py-3 text-sm font-medium ${INPUT_FOCUS}`}
            style={{ border: `1px solid ${INPUT_LINE}`, borderRadius: '9999px', color: INK, background: PAPER }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`text-sm font-bold px-5 sm:px-6 py-3 shrink-0 ${BTN_PRIMARY}`}
          style={{ ...KEEP_COLORS }}
        >
          {loading ? 'Searching…' : 'Find Orders'}
        </button>
      </form>

      {error && <p className="text-sm font-bold mt-2 mb-4 px-4" style={{ color: ALERT }}>{error}</p>}

      {orders !== null && orders.length === 0 && !error && (
        <div className="text-center py-16">
          <Package size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: PRIMARY }} />
          <p className="text-sm font-bold" style={{ color: GREY }}>No orders found for this number</p>
        </div>
      )}

      <div className="space-y-4 mt-6">
        {orders?.map((o) => {
          const statusStyle = STATUS_STYLES[o.status] || { color: GREY, background: GREY_WASH };
          return (
            <div
              key={o._id}
              className="p-4 sm:p-5"
              style={{ border: `1px solid ${LINE}`, borderRadius: R_LG, background: PAPER, boxShadow: '0 10px 24px rgba(45, 16, 40, 0.05)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold" style={{ color: INK }}>#{o.orderNumber}</span>
                <span
                  className="text-[10.5px] font-bold px-3 py-1 capitalize rounded-full"
                  style={{ ...statusStyle, ...KEEP_COLORS }}
                >
                  {o.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {o.items.map((it, i) => {
                  const reviewKey = `${o._id}-${it.product}`;
                  const alreadyReviewed = reviewedMap[o._id]?.has(String(it.product));
                  const canReview = o.status === 'delivered' && it.product && !it.isCombo;
                  const variantLabel = [it.sleeveType, it.zipType, it.pantOption?.name, it.shawlOption?.name]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div key={i}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 overflow-hidden shrink-0 relative"
                          style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: R_MD }}
                        >
                          {it.image && <Image src={it.image} alt={it.name} fill className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: INK }}>{it.name}</p>
                          <p className="text-xs font-medium" style={{ color: GREY }}>
                            Qty {it.qty}{variantLabel ? ` · ${variantLabel}` : ''}
                          </p>
                        </div>
                        {canReview && (
                          alreadyReviewed ? (
                            <span
                              className="flex items-center gap-1 text-[11px] font-bold shrink-0 px-2.5 py-1 rounded-full"
                              style={{ color: INK, background: ACCENT }}
                            >
                              <CheckCircle2 size={12} strokeWidth={2} style={{ color: PRIMARY }} /> Reviewed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenReview(openReview === reviewKey ? null : reviewKey)}
                              className="flex items-center gap-1 text-[11px] font-bold shrink-0 px-3 py-1.5 rounded-full transition-colors hover:bg-[#F8D7E3]"
                              style={{ color: INK, border: `1px solid rgba(194, 24, 91, 0.4)` }}
                            >
                              <Star size={12} strokeWidth={2} style={{ color: PRIMARY }} /> Rate
                            </button>
                          )
                        )}
                      </div>
                      {openReview === reviewKey && (
                        <ReviewForm
                          order={o}
                          item={it}
                          phone={phone.replace(/\D/g, '').slice(-10)}
                          onDone={() => markReviewed(o._id, it.product)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-sm pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
                <span className="font-medium" style={{ color: GREY }}>
                  {o.items.length} item{o.items.length > 1 ? 's' : ''}
                </span>
                <span className="font-bold text-base" style={{ color: INK }}>{formatINR(o.total)}</span>
              </div>

              {o.courier?.trackingId && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold mt-2.5" style={{ color: GREY }}>
                  <Truck size={12} strokeWidth={2} style={{ color: PRIMARY }} />
                  {o.courier.partner} · {o.courier.trackingId}
                </div>
              )}

              <p className="text-[11px] font-medium mt-1.5" style={{ color: GREY }}>
                {new Date(o.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}