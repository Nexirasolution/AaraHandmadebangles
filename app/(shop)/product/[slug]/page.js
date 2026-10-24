'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { ShoppingBag, Zap, Heart, Share2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getSizeStock } from '@/lib/stock';
import { resizeImage, buildSrcSet } from '@/lib/image';
import { useCart } from '@/components/CartContext';
import ColorSizeSelector from '@/components/ColorSizeSelector';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';

// Typography — Fraunces for headlines, Inter for UI.
const display = Fraunces({ subsets: ['latin'], weight: ['400', '500', '700'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });

// Design tokens — keep in sync with the homepage, ProductCard, Navbar and Footer.
//   Primary    #C2185B  badges, savings, active states, hover
//   Secondary  #D4A017  thin rings and dividers (decorative only)
//   Background #FFFFFF  pure white page, gallery and cards
//   Text       #2D1028  headings + body, dark buttons
//   Accent     #F8D7E3  soft washes and hovers
const PRIMARY = '#C2185B';
const SKELETON = 'rgba(248, 215, 227, 0.45)'; // loading placeholders on white
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const PAPER = '#FFFFFF';

const GREY = 'rgba(45, 16, 40, 0.75)';
const NEUTRAL = 'rgba(45, 16, 40, 0.55)';
const HAIRLINE = 'rgba(45, 16, 40, 0.12)';
const GOLD_LINE = 'rgba(212, 160, 23, 0.55)'; // thin decorative dividers

// Rounding scale: gallery / modals 20px · thumbnails 12px · buttons, badges, chips fully round.
const R_LG = '20px';
const R_MD = '12px';

// Dark pill, turns primary pink on hover
const BTN_PRIMARY =
  'rounded-full transition-colors active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed bg-[#2D1028] text-white border border-[#2D1028] hover:bg-[#C2185B] hover:border-[#C2185B]';
// White pill with pink-tinted border, accent wash on hover
const BTN_SECONDARY =
  'rounded-full transition-colors active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-[#2D1028] border border-[#C2185B]/40 hover:bg-[#F8D7E3] hover:border-[#C2185B]';

// Widths requested from the CDN for the main gallery image.
const MAIN_WIDTHS = [480, 720, 1080];
const MAIN_SIZES = '(max-width: 640px) 100vw, 48vw';

// Loading skeleton — shows the page shape instantly instead of a spinner.
function ProductSkeleton() {
  return (
    <div className={`${body.className} min-h-screen`} style={{ background: PAPER }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-4 sm:pt-16">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-16 animate-pulse">
          <div className="w-full aspect-square" style={{ background: SKELETON, borderRadius: R_LG }} />
          <div className="flex flex-col gap-4">
            <div className="h-3 w-24 rounded-full" style={{ background: SKELETON }} />
            <div className="h-8 w-3/4 rounded-full" style={{ background: SKELETON }} />
            <div className="h-6 w-32 rounded-full" style={{ background: SKELETON }} />
            <div className="h-32 w-full" style={{ background: SKELETON, borderRadius: R_LG }} />
            <div className="h-12 w-full rounded-full" style={{ background: SKELETON }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [activeVariant, setActiveVariant] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeSize, setActiveSize] = useState('');
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Size guide carousel modal
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [sizeChartIndex, setSizeChartIndex] = useState(0);

  const { addItem } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch with abort so a quick navigation never sets stale data.
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    fetch(`/api/products/${slug}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setActiveVariant(d.product?.variants?.[0]);
        setActiveImage(0);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort();
  }, [slug]);

  // Warm the browser cache for the neighbouring gallery images so
  // arrows / thumbnail taps feel instant.
  const galleryImages = activeVariant?.images || [];
  useEffect(() => {
    if (galleryImages.length < 2) return;
    const next = galleryImages[(activeImage + 1) % galleryImages.length];
    const prev = galleryImages[(activeImage - 1 + galleryImages.length) % galleryImages.length];
    [next, prev].forEach((src) => {
      if (!src) return;
      const img = new window.Image();
      img.src = resizeImage(src, 720);
    });
  }, [activeImage, activeVariant]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data?.product) {
    return <ProductSkeleton />;
  }

  const { product, related } = data;
  const images = activeVariant?.images || [];
  const unitPrice = activeVariant?.price || 0;
  const unitCompareAtPrice = activeVariant?.compareAtPrice > activeVariant?.price
    ? activeVariant.compareAtPrice
    : 0;
  const discount = unitCompareAtPrice > unitPrice
    ? Math.round(((unitCompareAtPrice - unitPrice) / unitCompareAtPrice) * 100)
    : 0;

  // Size guide: the product's own images, else the category's fallback.
  const sizeChartImages = product.sizeChart?.length ? product.sizeChart : (product.category?.sizeChart || []);

  const selectedSizeStock = getSizeStock(activeVariant, activeSize);
  const sizeOutOfStock = !!activeSize && selectedSizeStock <= 0;

  // Jewellery details shown under the price. Empty values are skipped.
  const details = [
    ['Material', product.material],
    ['Finish', product.finish],
    ['Stone work', product.stoneType],
    ['Set contains', product.piecesInSet > 1 ? `${product.piecesInSet} pieces` : ''],
    ['Occasion', product.occasion?.join(', ')],
  ].filter(([, value]) => value);

  // Max quantity the shopper can add for the chosen size.
  // Infinity = no size picked yet, so no cap is applied.
  function stockCap() {
    if (!activeSize) return Infinity;
    return getSizeStock(activeVariant, activeSize);
  }

  function prevImage() { setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1)); }
  function nextImage() { setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1)); }

  function prevSizeChart() { setSizeChartIndex((i) => (i === 0 ? sizeChartImages.length - 1 : i - 1)); }
  function nextSizeChart() { setSizeChartIndex((i) => (i === sizeChartImages.length - 1 ? 0 : i + 1)); }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  }

  function handleColorChange(v) {
    setActiveVariant(v);
    setActiveImage(0);
    setActiveSize('');
    setQty(1);
  }

  function handleSizeChange(size) {
    setActiveSize(size);
    const stock = getSizeStock(activeVariant, size);
    setQty((q) => (stock > 0 && stock !== Infinity ? Math.min(q, stock) : 1));
  }

  function buildCartPayload() {
    return {
      productId: product._id,
      variantId: activeVariant._id,
      comboId: null,
      name: product.name,
      image: activeVariant.images?.[0], // original URL — cart keeps full quality
      color: activeVariant.color,
      size: activeSize,
      price: unitPrice,
      qty,
      stock: stockCap(),
    };
  }

  function validateSelection() {
    if (!activeSize) { toast.error('Please select a size'); return false; }
    const stock = stockCap();
    if (stock <= 0) { toast.error('This size is out of stock'); return false; }
    if (qty > stock) {
      toast.error(`Only ${stock} left in stock`);
      setQty(stock);
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (!validateSelection()) return;
    addItem(buildCartPayload());
  }

  function handleBuyNow() {
    if (!validateSelection()) return;
    addItem(buildCartPayload());
    router.push('/checkout');
  }

  const mainImage = images[activeImage];

  return (
    <div className={`${body.className} ${display.variable}`} style={{ background: PAPER }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-4 sm:pt-16 pb-24 sm:pb-20">

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-16">

          {/* ── Gallery ── */}
          <div className="min-w-0 sm:sticky sm:top-10 sm:self-start">
            {/* Square frame — jewellery photos are mostly 1:1 and the whole
                piece (a stack of bangles, a necklace) must stay visible. */}
            <div
              className="relative w-full aspect-square overflow-hidden"
              style={{ background: PAPER, borderRadius: R_LG, border: `1px solid ${HAIRLINE}` }}
            >
              {mainImage && (
                <img
                  key={mainImage}
                  src={resizeImage(mainImage, 720)}
                  srcSet={buildSrcSet(mainImage, MAIN_WIDTHS)}
                  sizes={MAIN_SIZES}
                  alt={product.name}
                  width={720}
                  height={720}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-contain sm:object-cover sm:object-center"
                />
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity"
                    aria-label="Previous image"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.9)' }}>
                      <ChevronLeft size={18} strokeWidth={2} style={{ color: INK }} />
                    </span>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity"
                    aria-label="Next image"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.9)' }}>
                      <ChevronRight size={18} strokeWidth={2} style={{ color: INK }} />
                    </span>
                  </button>

                  <div
                    className="absolute bottom-3 right-3 text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full"
                    style={{ color: INK, background: 'rgba(255,255,255,0.85)' }}
                  >
                    {String(activeImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails — tiny 112x112 CDN crops instead of full-size images */}
            {images.length > 1 && (
              <div className="flex gap-2.5 sm:gap-3 mt-3 overflow-x-auto py-1 px-1 -mx-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className="relative w-14 h-14 overflow-hidden shrink-0 transition-all"
                    style={{
                      opacity: i === activeImage ? 1 : 0.5,
                      borderRadius: R_MD,
                      boxShadow: i === activeImage ? `0 0 0 2px ${PRIMARY}` : 'none',
                    }}
                  >
                    <img
                      src={resizeImage(img, 112, 112)}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2.5 sm:gap-3 mt-3 sm:mt-4">
              <button
                onClick={() => { setWished((w) => !w); toast.success(wished ? 'Removed from wishlist' : 'Added to wishlist'); }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 sm:py-2 rounded-full transition-colors hover:bg-[#F8D7E3]"
                style={{ color: wished ? PRIMARY : INK, border: `1px solid ${wished ? PRIMARY : HAIRLINE}` }}
              >
                <Heart size={14} strokeWidth={2} fill={wished ? PRIMARY : 'none'} style={{ color: wished ? PRIMARY : undefined }} />
                {wished ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 sm:py-2 rounded-full transition-colors hover:bg-[#F8D7E3]"
                style={{ color: INK, border: `1px solid ${HAIRLINE}` }}
              >
                <Share2 size={14} strokeWidth={2} />
                Share
              </button>
            </div>

            {/* Videos — preload="none" so they never compete with the images;
                the browser only downloads when the shopper presses play. */}
            {product.videos?.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {product.videos.map((url, i) => (
                  <video
                    key={i}
                    src={url}
                    controls
                    playsInline
                    preload="none"
                    className="w-full"
                    style={{ borderRadius: R_LG, background: PAPER }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Details ── */}
          <div className="flex flex-col min-w-0">
            {product.category?.name && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5 sm:mb-2" style={{ color: PRIMARY }}>
                {product.category.name}
              </p>
            )}

            <h1
              className={`${display.className} text-[20px] sm:text-[32px] leading-[1.15]`}
              style={{ color: INK, fontWeight: 700, letterSpacing: '-0.01em' }}
            >
              {product.name}
            </h1>

            {(product.isReadyToShip || product.piecesInSet > 1) && (
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-2.5">
                {product.isReadyToShip && (
                  <span
                    className="inline-block px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide w-fit rounded-full"
                    style={{ background: ACCENT, color: INK }}
                  >
                    Ready to Ship
                  </span>
                )}
                {product.piecesInSet > 1 && (
                  <span
                    className="inline-block px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide w-fit rounded-full"
                    style={{ border: `1px solid ${GOLD_LINE}`, color: INK }}
                  >
                    Set of {product.piecesInSet}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-baseline gap-3 mt-3 sm:mt-6 flex-wrap">
              <span className={`${display.className} text-[22px] sm:text-[26px]`} style={{ color: INK, fontWeight: 700 }}>
                {formatINR(unitPrice)}
              </span>
              {unitCompareAtPrice > unitPrice && (
                <span className="line-through text-sm font-medium" style={{ color: NEUTRAL }}>
                  {formatINR(unitCompareAtPrice)}
                </span>
              )}
              {discount > 0 && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ color: '#FFFFFF', background: PRIMARY }}
                >
                  {discount}% off
                </span>
              )}
            </div>

            {/* Jewellery details: material, finish, stone work, set size, occasion */}
            {details.length > 0 && (
              <dl className="mt-4 sm:mt-5 grid grid-cols-[104px_1fr] gap-x-4 gap-y-2 text-sm">
                {details.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="font-medium" style={{ color: NEUTRAL }}>{label}</dt>
                    <dd className="font-bold" style={{ color: INK }}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-4 pt-4 sm:mt-8 sm:pt-8" style={{ borderTop: `1px solid ${GOLD_LINE}` }}>
              <ColorSizeSelector
                variants={product.variants}
                activeVariant={activeVariant}
                onColorChange={handleColorChange}
                activeSize={activeSize}
                onSizeChange={handleSizeChange}
                categoryType={product.category?.type}
                sizeChartImages={sizeChartImages}
                onViewSizeChart={() => { setSizeChartIndex(0); setSizeChartOpen(true); }}
                // Clothing-only props. Empty on purpose until ColorSizeSelector
                // itself is cleaned up — then these four lines can be deleted.
                sleeveOptions={[]}
                zipOptions={[]}
                pantOptions={[]}
                shawlOptions={[]}
                formatINR={formatINR}
              />
            </div>

            <div className="flex items-center gap-4 mt-4 sm:mt-6 flex-wrap">
              <p className="text-sm font-bold" style={{ color: INK }}>Qty</p>
              {/* Rounded stepper */}
              <div
                className="flex items-center gap-1 rounded-full px-1"
                style={{ border: `1px solid ${HAIRLINE}` }}
              >
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full text-base font-bold leading-none transition-colors hover:bg-[#F8D7E3]"
                  style={{ color: INK }}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="text-sm font-bold w-6 text-center" style={{ color: INK }}>{qty}</span>
                <button
                  onClick={() => setQty((q) => {
                    const cap = stockCap();
                    return cap > 0 && cap !== Infinity ? Math.min(cap, q + 1) : q + 1;
                  })}
                  disabled={(() => { const cap = stockCap(); return !!activeSize && cap !== Infinity && qty >= cap; })()}
                  className="w-8 h-8 rounded-full text-base font-bold leading-none transition-colors hover:bg-[#F8D7E3] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  style={{ color: INK }}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {(() => {
                const cap = stockCap();
                return !!activeSize && cap !== Infinity && cap > 0 && cap <= 5 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: PRIMARY, background: ACCENT }}>
                    Only {cap} left
                  </span>
                );
              })()}
              {sizeOutOfStock && (
                <span className="text-xs font-bold" style={{ color: GREY }}>Out of stock</span>
              )}
            </div>

            {/* CTAs — hidden on mobile in favor of the sticky bar below */}
            <div className="hidden sm:flex flex-col gap-2.5 mt-8">
              <button
                onClick={handleBuyNow}
                disabled={sizeOutOfStock}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 ${BTN_PRIMARY}`}
              >
                <Zap size={16} fill="currentColor" strokeWidth={0} /> {sizeOutOfStock ? 'Out of Stock' : 'Buy Now'}
              </button>
              <button
                onClick={handleAddToCart}
                disabled={sizeOutOfStock}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 ${BTN_SECONDARY}`}
              >
                <ShoppingBag size={15} /> {sizeOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

            {product.description && (
              <div
                className="mt-6 sm:mt-8 p-5 text-sm leading-relaxed font-medium"
                style={{ color: GREY, background: PAPER, border: `1px solid ${HAIRLINE}`, borderRadius: R_LG }}
              >
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: INK }}>
                  Description
                </h3>
                <p>{product.description}</p>
              </div>
            )}

            {product.careInstructions && (
              <div
                className="mt-4 p-5 text-sm leading-relaxed font-medium"
                style={{ color: GREY, background: PAPER, border: `1px solid ${HAIRLINE}`, borderRadius: R_LG }}
              >
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: INK }}>
                  Care
                </h3>
                <p>{product.careInstructions}</p>
              </div>
            )}

            <div className="h-4 sm:h-0" />
          </div>
        </div>

        {/* Reviews — still disabled. When you re-enable, use plain <img>
            with resizeImage(img, 120) for the review thumbnails. */}

        {/* Related */}
        {related?.length > 0 && (
          <div className="mt-20 sm:mt-28">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.18em] mb-8 pb-3" style={{ color: INK, borderBottom: `1px solid ${GOLD_LINE}` }}>
              You may also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* Sticky mobile buy bar */}
      {mounted && createPortal(
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 flex items-center gap-3 px-5 py-3"
          style={{
            background: PAPER,
            borderTop: `1px solid ${GOLD_LINE}`,
            borderTopLeftRadius: R_LG,
            borderTopRightRadius: R_LG,
            boxShadow: '0 -6px 20px rgba(45, 16, 40, 0.10)',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            zIndex: 9999,
          }}
        >
          <div className="shrink-0">
            <p className="text-base font-bold leading-none" style={{ color: INK }}>
              {formatINR(unitPrice)}
            </p>
            {unitCompareAtPrice > unitPrice && (
              <p className="text-[11px] line-through font-medium leading-none mt-1" style={{ color: NEUTRAL }}>
                {formatINR(unitCompareAtPrice)}
              </p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={sizeOutOfStock}
            className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 text-sm ${BTN_SECONDARY}`}
          >
            <ShoppingBag size={15} /> Cart
          </button>
          <button
            onClick={handleBuyNow}
            disabled={sizeOutOfStock}
            className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 text-sm ${BTN_PRIMARY}`}
          >
            <Zap size={15} fill="currentColor" strokeWidth={0} /> {sizeOutOfStock ? 'Sold out' : 'Buy now'}
          </button>
        </div>,
        document.body
      )}

      {/* Review-image lightbox */}
      {mounted && lightboxImg && createPortal(
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{ background: 'rgba(45, 16, 40, 0.9)', zIndex: 10000 }}
        >
          <div className="relative w-full max-w-md aspect-square" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-11 right-0 sm:-top-2 sm:-right-11 w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(248, 215, 227, 0.25)', color: PAPER }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <img
              src={resizeImage(lightboxImg, 900)}
              alt="Review image"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ borderRadius: R_LG }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Size guide modal */}
      {mounted && sizeChartOpen && sizeChartImages.length > 0 && createPortal(
        <div
          onClick={() => setSizeChartOpen(false)}
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{ background: 'rgba(45, 16, 40, 0.9)', zIndex: 10000 }}
        >
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSizeChartOpen(false)}
              className="absolute -top-11 right-0 sm:-top-2 sm:-right-11 w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(248, 215, 227, 0.25)', color: PAPER }}
              aria-label="Close size guide"
            >
              <X size={20} />
            </button>

            <div className="relative w-full aspect-square" style={{ background: PAPER, borderRadius: R_LG, overflow: 'hidden' }}>
              <img
                src={resizeImage(sizeChartImages[sizeChartIndex], 900)}
                alt={`Size guide ${sizeChartIndex + 1} of ${sizeChartImages.length}`}
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {sizeChartImages.length > 1 && (
                <>
                  <button
                    onClick={prevSizeChart}
                    className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-2"
                    aria-label="Previous size guide image"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.9)', border: `1px solid ${HAIRLINE}` }}>
                      <ChevronLeft size={20} strokeWidth={2} style={{ color: INK }} />
                    </span>
                  </button>
                  <button
                    onClick={nextSizeChart}
                    className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-2"
                    aria-label="Next size guide image"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.9)', border: `1px solid ${HAIRLINE}` }}>
                      <ChevronRight size={20} strokeWidth={2} style={{ color: INK }} />
                    </span>
                  </button>

                  <div
                    className="absolute bottom-3 right-3 text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full"
                    style={{ color: INK, background: 'rgba(255,255,255,0.85)' }}
                  >
                    {String(sizeChartIndex + 1).padStart(2, '0')} / {String(sizeChartImages.length).padStart(2, '0')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}