'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '@/components/CartContext';
import { useWishlist } from '@/components/WhishlistContext';

// Design tokens — full-width floating black pill.
//   Black      #000000  the pill
//   White      #FFFFFF  icons + labels
//   Primary    #C2185B  active icon + label, badges
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const PRIMARY = '#C2185B';

// How far the nav floats above the bottom edge (plus the phone's safe area).
const FLOAT_GAP = 12; // px

// Side margin: the pill spans the full width minus this gap on each side.
const SIDE_GAP = 12; // px

// Height of the pill is about 60px, so anything else floating at the bottom
// (e.g. the WhatsApp button) should sit at least this far up to stay visible:
//   bottom: calc(env(safe-area-inset-bottom) + 88px)
// (88 = 12px float gap + ~60px pill + ~16px breathing room)

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/cart', label: 'Cart', icon: ShoppingBag },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count: cartCount } = useCart();
  const { wishlist } = useWishlist();

  // Admin pages have their own shell/navigation — never show the storefront
  // bottom nav (or its spacer) there.
  if (pathname?.startsWith('/admin')) return null;

  const wishlistCount = wishlist?.length || 0;

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.label === 'Wishlist' ? wishlistCount : item.label === 'Cart' ? cartCount : undefined,
  }));

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Spacer so page content isn't hidden behind the floating mobile nav */}
      <div className="md:hidden h-24" />

      <nav
        aria-label="Main"
        className="md:hidden fixed z-40 rounded-full"
        style={{
          left: SIDE_GAP,
          right: SIDE_GAP,
          bottom: `calc(env(safe-area-inset-bottom) + ${FLOAT_GAP}px)`,
          background: BLACK,
          boxShadow: '0 14px 30px rgba(0, 0, 0, 0.28)',
        }}
      >
        <div className="flex items-stretch justify-between px-3 py-2">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            const color = active ? PRIMARY : WHITE;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-transform active:scale-90"
              >
                <span className="relative">
                  <Icon
                    size={21}
                    strokeWidth={2.5}
                    style={{ color }}
                    fill={active && label === 'Wishlist' ? PRIMARY : 'none'}
                  />
                  {badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2.5 text-[8px] font-extrabold leading-none rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-[3px]"
                      style={{ background: PRIMARY, color: WHITE, border: `1.5px solid ${BLACK}` }}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>

                <span
                  className="text-[9px] font-extrabold tracking-wide truncate max-w-full"
                  style={{ color }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}