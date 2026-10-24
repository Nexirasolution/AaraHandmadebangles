'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatINR } from '@/lib/utils';
import { getVariantTotalStock } from '@/lib/stock';
import { useWishlist } from '@/components/WhishlistContext'; // adjust path as needed
import { useCart } from '@/components/CartContext';

// Design tokens — keep in sync with the homepage, Navbar, BannerCarousel and CouponMarquee.
//   Primary    #C2185B  buy-hover, sale badge, savings, active chip, wishlist
//   Secondary  #D4A017  thin rings and dividers (decorative only)
//   Background #FFF8F3  image backdrop, disabled surfaces
//   Text       #2D1028  titles, prices, dark buttons
//   Accent     #F8D7E3  soft hovers
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const CREAM = '#FFF8F3';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const WHITE = '#FFFFFF';

const INK_SOFT = 'rgba(45, 16, 40, 0.68)';
const HAIRLINE = 'rgba(45, 16, 40, 0.12)';
const DISABLED = 'rgba(45, 16, 40, 0.30)';
const PAPER = WHITE;
const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const EASE = 'cubic-bezier(.22,.9,.3,1)';

// Rounding scale: card 20px (same as the combo cards) · chips + buttons + badges fully round.
const CARD_RADIUS = '20px';

// Products with a sleeve or zip choice can't be added straight from the card,
// so those cards send the shopper to the product page instead.
// Adjust these field names if your Product model calls them something else.
const OPTION_FIELDS = ['sleeveOptions', 'zipOptions'];

// ---------------------------------------------------------------------------
// Image sizing — no server CPU involved.
// If the image is on Cloudinary, ask the CDN for a resized WebP/AVIF copy
// (f_auto,q_auto) instead of the full-size upload. Any other URL (including
// /placeholder.png) is returned untouched.
// ---------------------------------------------------------------------------
function resizeImage(url, width) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

const IMG_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

// Card hover (lift + soft shadow) and image zoom — plain CSS, no JS handlers.
const CSS = `
.pc-card{
  background:${PAPER};border:1px solid ${HAIRLINE};border-radius:${CARD_RADIUS};overflow:hidden;
  transition:transform .45s ${EASE},box-shadow .45s ease,border-color .3s ease;
}
.pc-card:hover{
  transform:translateY(-4px);border-color:rgba(194,24,91,.35);
  box-shadow:0 18px 36px rgba(45,16,40,.12);
}
.pc-card img.pc-img{transition:transform .7s ${EASE}}
.pc-card:hover img.pc-img{transform:scale(1.05)}
@media (prefers-reduced-motion:reduce){
  .pc-card,.pc-card img.pc-img{transition:none}
}
`;

// ---------------------------------------------------------------------------
// Action buttons (fully rounded pills)
// Mobile (< md):  ( 🛍 ) (        Buy now        )   -> round cart icon + wide buy pill
// Desktop (md+):  ( 🛍 Add to cart ) ( Buy now )     -> two equal pills with labels
// 44px tall on mobile for easy tapping, 40px on desktop.
// ---------------------------------------------------------------------------
const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 h-11 md:h-10 rounded-full text-[12px] sm:text-[13px] font-bold tracking-wide whitespace-nowrap transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';

// Secondary: white with dark text and a soft pink-tinted border; accent wash on hover
const BTN_CART = `${BTN_BASE} w-11 shrink-0 md:w-auto md:flex-1 md:px-3 bg-white text-[#2D1028] border border-[#C2185B]/40 hover:bg-[#F8D7E3] hover:border-[#C2185B]`;
const BTN_CART_ADDED = `${BTN_BASE} w-11 shrink-0 md:w-auto md:flex-1 md:px-3 bg-[#F8D7E3] text-[#2D1028] border border-[#C2185B]`;

// Primary: dark pill with white text, turns primary pink on hover
const BTN_BUY = `${BTN_BASE} flex-1 px-3 bg-[#2D1028] text-white border border-[#2D1028] hover:bg-[#C2185B] hover:border-[#C2185B]`;
const BTN_FULL = `${BTN_BASE} w-full px-3 bg-[#2D1028] text-white border border-[#2D1028] hover:bg-[#C2185B] hover:border-[#C2185B]`;

export default function ProductCard({ product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const variant = product.variants?.[0];
  const image = variant?.images?.[0] || '/placeholder.png';
  const price = product.basePrice || variant?.price || 0;
  const compareAt = variant?.compareAtPrice || 0;
  const discountPct = compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const sizes = variant?.sizes || [];
  const hasSizes = sizes.length > 0;

  const totalStock = getVariantTotalStock(variant);
  const outOfStock = totalStock <= 0;
  const lowStock = !outOfStock && totalStock <= 5;

  // If the product only comes in one size, pick it automatically.
  const [selectedSize, setSelectedSize] = useState(() =>
    sizes.length === 1 && sizes[0].stock > 0 ? sizes[0].size : ''
  );
  const [added, setAdded] = useState(false);
  const selectedStock = sizes.find((s) => s.size === selectedSize)?.stock ?? 0;

  // Brief "Added" confirmation on the cart button
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const needsProductPage = OPTION_FIELDS.some((k) => product[k]?.length > 0) || !hasSizes;

  const wishlistId = product.id ?? product._id ?? product.slug;
  const wishlisted = isWishlisted(wishlistId);
  const href = `/product/${product.slug}`;

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(wishlistId);
  };

  function buildItem() {
    return {
      productId: product._id ?? product.id,
      slug: product.slug,
      variantId: variant?._id,
      name: product.name,
      image, // original URL — the cart keeps the full-quality image
      color: variant?.color || '-',
      colorHex: variant?.colorHex,
      size: selectedSize,
      price,
      stock: selectedStock,
      qty: 1,
    };
  }

  function requireSize() {
    if (!selectedSize) {
      toast.error('Please select a size');
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (!requireSize()) return;
    addItem(buildItem());
    setAdded(true);
  }

  function handleBuyNow() {
    if (!requireSize()) return;
    addItem(buildItem());
    router.push('/checkout');
  }

  return (
    <div className="pc-card" style={{ fontFamily: FONT_SANS }}>
      <style>{CSS}</style>

      {/* Image (the card's overflow:hidden gives it the rounded top corners) */}
      <div className="relative">
        <Link href={href} className="block" aria-label={product.name}>
          <div className="relative aspect-[3/4] overflow-hidden" style={{ background: CREAM }}>
            {/* Plain <img>: lazy-loaded, sized by the CDN, zero server CPU
                (next/image would resize every picture on your own server). */}
            <img
              src={resizeImage(image, 600)}
              srcSet={`${resizeImage(image, 400)} 400w, ${resizeImage(image, 600)} 600w, ${resizeImage(image, 900)} 900w`}
              sizes={IMG_SIZES}
              alt={product.name}
              width={600}
              height={800}
              loading="lazy"
              decoding="async"
              className={`pc-img absolute inset-0 w-full h-full object-cover ${outOfStock ? 'grayscale opacity-70' : ''}`}
            />
          </div>
        </Link>

        {/* Status badge */}
        <div className="absolute top-3 left-3 pointer-events-none">
          {outOfStock ? (
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: WHITE, background: INK_SOFT, padding: '5px 12px', borderRadius: '999px' }}
            >
              Out of stock
            </span>
          ) : lowStock ? (
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: WHITE, background: INK, padding: '5px 12px', borderRadius: '999px' }}
            >
              {totalStock} left
            </span>
          ) : discountPct > 0 ? (
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: WHITE, background: PRIMARY, padding: '5px 12px', borderRadius: '999px' }}
            >
              Sale
            </span>
          ) : null}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          className="absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: `1px solid ${wishlisted ? PRIMARY : HAIRLINE}`,
            backdropFilter: 'blur(2px)',
          }}
        >
          <Heart
            className="w-4 h-4"
            strokeWidth={2}
            style={{ color: wishlisted ? PRIMARY : INK }}
            fill={wishlisted ? PRIMARY : 'none'}
          />
        </button>
      </div>

      {/* Details */}
      <div className="p-3.5" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        {/* Title + price */}
        <Link href={href} className="block">
          <h3
            className="text-[13px] sm:text-sm font-bold line-clamp-2"
            style={{ color: INK, lineHeight: 1.375, minHeight: '2.75em' }}
          >
            {product.name}
          </h3>

          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-base sm:text-lg" style={{ color: INK }}>
              {formatINR(price)}
            </span>
            {compareAt > price && (
              <span className="text-xs sm:text-sm line-through font-normal" style={{ color: INK_SOFT }}>
                {formatINR(compareAt)}
              </span>
            )}
            {discountPct > 0 && (
              <span className="text-xs font-bold" style={{ color: PRIMARY }}>
                Save {discountPct}%
              </span>
            )}
          </div>
        </Link>

        {/* Size chips — only when the card can add straight to cart */}
        {!outOfStock && !needsProductPage && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Select size">
            {sizes.map((s) => {
              const soldOut = s.stock <= 0;
              const active = selectedSize === s.size;
              return (
                <button
                  key={s.size}
                  type="button"
                  disabled={soldOut}
                  onClick={() => setSelectedSize(s.size)}
                  aria-pressed={active}
                  className="min-w-[32px] h-8 px-2.5 text-[11px] font-bold transition-colors"
                  style={{
                    borderRadius: '999px',
                    border: `1px solid ${active ? PRIMARY : soldOut ? HAIRLINE : 'rgba(194,24,91,.30)'}`,
                    background: active ? PRIMARY : PAPER,
                    color: soldOut ? DISABLED : active ? WHITE : INK,
                    textDecoration: soldOut ? 'line-through' : 'none',
                    cursor: soldOut ? 'not-allowed' : 'pointer',
                  }}
                >
                  {s.size}
                </button>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-stretch gap-2">
          {outOfStock ? (
            <button
              type="button"
              disabled
              className={`${BTN_BASE} w-full`}
              style={{ background: CREAM, color: INK_SOFT, border: `1px solid ${HAIRLINE}` }}
            >
              Out of stock
            </button>
          ) : needsProductPage ? (
            <Link href={href} className={BTN_FULL}>
              Choose options
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                className={added ? BTN_CART_ADDED : BTN_CART}
                aria-label="Add to cart"
                title="Add to cart"
              >
                {added ? (
                  <Check size={16} strokeWidth={2} style={{ color: PRIMARY }} />
                ) : (
                  <ShoppingBag size={16} strokeWidth={1.5} />
                )}
                <span className="hidden md:inline">{added ? 'Added' : 'Add to cart'}</span>
              </button>

              <button type="button" onClick={handleBuyNow} className={BTN_BUY}>
                Buy now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}