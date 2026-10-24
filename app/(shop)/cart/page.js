'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart, cartKey } from '@/components/CartContext';
import { formatINR } from '@/lib/utils';
import { Trash2, ShoppingBag } from 'lucide-react';

// Design tokens — keep in sync with the homepage, ProductCard, ProductPage and Footer.
//   Primary    #C2185B  prices' accents, icons, button hover
//   Secondary  #D4A017  thin divider (decorative only)
//   Background #FFFFFF  pure white page and cards
//   Text       #2D1028  headings + body, dark buttons
//   Accent     #F8D7E3  soft hovers
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const PAPER = '#FFFFFF';

const INK_SOFT = 'rgba(45, 16, 40, 0.72)';
const LINE = 'rgba(45, 16, 40, 0.12)';
const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

// Rounding scale: cart rows + summary 20px · thumbnails 12px · buttons and stepper fully round.
const R_LG = '20px';
const R_MD = '12px';

// Dark pill, turns primary pink on hover — same as the other pages.
const BTN_PRIMARY =
  'rounded-full transition-all active:scale-[0.98] active:opacity-80 bg-[#2D1028] text-white border border-[#2D1028] hover:bg-[#C2185B] hover:border-[#C2185B] hover:shadow-[0_10px_24px_rgba(194,24,91,0.25)]';

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center" style={{ background: PAPER }}>
        <ShoppingBag size={30} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: PRIMARY }} />
        <p className="text-[17px] font-bold mb-1" style={{ color: INK, fontFamily: FONT_SERIF }}>Your cart is empty</p>
        <p className="text-sm font-medium mb-7" style={{ color: INK_SOFT }}>Add something beautiful from our collection.</p>
        <Link
          href="/"
          className={`inline-block px-7 py-3 text-sm font-bold ${BTN_PRIMARY}`}
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 sm:py-14" style={{ background: PAPER }}>
      <h1 className="text-[24px] sm:text-[28px] font-bold" style={{ fontFamily: FONT_SERIF, color: INK }}>
        Your Cart
      </h1>
      <div className="mt-3 mb-8 h-[2px] w-12 rounded-full" style={{ background: GOLD }} />

      <div className="space-y-3 sm:space-y-4">
        {items.map((item) => {
          const key = cartKey(item);
          return (
            <div
              key={key}
              className="flex gap-3 sm:gap-4 p-3 sm:p-4"
              style={{
                background: PAPER,
                border: `1px solid ${LINE}`,
                borderRadius: R_LG,
                boxShadow: '0 10px 24px rgba(45, 16, 40, 0.05)',
              }}
            >
              {/* Product image */}
              <div
                className="relative shrink-0 w-16 h-20 sm:w-20 sm:h-24 overflow-hidden"
                style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: R_MD }}
              >
                <Image src={item.image || '/placeholder.png'} alt={item.name} fill className="object-cover" />
              </div>

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold line-clamp-1" style={{ color: INK }}>{item.name}</p>
                <p className="text-xs font-medium mt-1" style={{ color: INK_SOFT }}>
                  Color: {item.color} &nbsp;·&nbsp; Size: {item.size}
                </p>
                <p className="text-sm mt-1.5 font-bold" style={{ color: INK }}>{formatINR(item.price)}</p>

                {/* Qty controls + remove */}
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className="flex items-center rounded-full px-0.5"
                    style={{ border: `1px solid ${LINE}` }}
                  >
                    <button
                      onClick={() => updateQty(key, item.qty - 1)}
                      className="w-8 h-8 rounded-full text-base font-bold leading-none transition-colors hover:bg-[#F8D7E3] active:opacity-60"
                      style={{ color: INK }}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold" style={{ color: INK }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(key, item.qty + 1)}
                      className="w-8 h-8 rounded-full text-base font-bold leading-none transition-colors hover:bg-[#F8D7E3] active:opacity-60"
                      style={{ color: INK }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(key)}
                    className="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-[#F8D7E3] hover:text-[#C2185B] active:opacity-60"
                    style={{ color: INK_SOFT }}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {/* Line total */}
              <p className="text-sm shrink-0 self-start pt-0.5 font-bold" style={{ color: INK }}>
                {formatINR(item.price * item.qty)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary + checkout */}
      <div
        className="mt-6 p-4 sm:p-5"
        style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: R_LG }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: INK_SOFT }}>Subtotal</span>
          <span className="text-xl font-bold" style={{ color: INK, fontFamily: FONT_SERIF }}>{formatINR(subtotal)}</span>
        </div>

        <Link
          href="/checkout"
          className={`block w-full text-center mt-5 py-3.5 text-sm font-bold ${BTN_PRIMARY}`}
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}