'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, ChevronDown, ClipboardList, Heart } from 'lucide-react';
import { useCart } from './CartContext';
import { useWishlist } from './WhishlistContext';
import CouponMarquee from './CouponMarquee';

// Palette — keep in sync with CouponMarquee.
// Primary #C2185B · Secondary #D4A017 · Background #FFF8F3 · Text #2D1028 · Accent #F8D7E3
const PRIMARY = '#C2185B';
const INK = '#2D1028';
const INK_SOFT = 'rgba(45, 16, 40, 0.65)';
const LINE = 'rgba(45, 16, 40, 0.12)';
const WHITE = '#FFFFFF';

const ENQUIRY_LINKS = [
  { label: 'Bulk Order Enquiry', href: '/bulk-enquiry' },
  // { label: 'Contact Us', href: '/contact' },
];

const EASE = 'cubic-bezier(.22,.9,.3,1)';

// Animation set (all transform/opacity only, so it stays smooth):
//  · header   – slides in on load, shadow appears + logo scales down on scroll
//  · .nv-link – liquid fill rises inside the link on hover (two slowly turning waves)
//  · .nv-icon – dark water rises inside the button on hover + a ripple on click
//  · .nv-wave – two thin wavy lines flow slowly under the header
//  · .nv-burger – three lines morph into an X
//  · .nv-drop / .nv-rise – dropdowns settle in, items stagger in one by one
//  · .nv-overlay – mobile menu opens as a circle growing from the hamburger
//  · Collapse – mobile accordions open with a smooth height animation
const WAVE_SVG = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='8' viewBox='0 0 48 8'%3E%3Cpath d='M0 4 Q12 0 24 4 T48 4' fill='none' stroke='${color}' stroke-width='1.3'/%3E%3C/svg%3E")`;

const CSS = `
.nv-enter{animation:nv-enter .6s ${EASE} both}
@keyframes nv-enter{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}

/* Liquid fill: two slowly turning blobs rise inside the shape on hover */
.nv-link{position:relative;isolation:isolate;overflow:hidden;color:${INK}}
.nv-link::before,.nv-link::after,.nv-fx::before,.nv-fx::after{
  content:'';position:absolute;left:-50%;top:105%;width:200%;height:200%;border-radius:42%;
  z-index:-1;pointer-events:none;transition:top .8s ${EASE};
}
.nv-link::before{background:rgba(248,215,227,.95);animation:nv-spin 7s linear infinite}
.nv-link::after{background:rgba(194,24,91,.10);animation:nv-spin 11s linear infinite reverse}
/* Wide pills: use a fixed square blob so it keeps filling the link while it turns */
.nv-link::before,.nv-link::after{left:calc(50% - 120px);width:240px;height:240px}
.nv-link:hover::before,.nv-link[data-active="true"]::before{top:calc(50% - 136px)}
.nv-link:hover::after,.nv-link[data-active="true"]::after{top:calc(50% - 122px)}
@keyframes nv-spin{to{transform:rotate(360deg)}}

.nv-sub{color:${INK_SOFT};display:inline-block;transition:color .25s ease,transform .3s ${EASE}}
.nv-sub:hover{color:${INK};transform:translateX(4px)}

.nv-icon{
  position:relative;isolation:isolate;display:flex;align-items:center;justify-content:center;
  border-radius:9999px;border:1px solid ${LINE};color:${INK};background:${WHITE};
  transition:color .3s ease,border-color .3s ease,transform .3s ${EASE};
}
/* icon turns white a beat after the water starts rising */
.nv-icon:hover{
  color:${WHITE};border-color:${INK};transform:translateY(-2px);
  transition:color .3s ease .3s,border-color .3s ease,transform .3s ${EASE};
}
.nv-icon:active{transform:translateY(0) scale(.94)}
.nv-fx{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:-1}
.nv-fx::before{background:rgba(194,24,91,.35);animation:nv-spin 8s linear infinite}
.nv-fx::after{background:${INK};animation:nv-spin 6s linear infinite reverse}
.nv-icon:hover .nv-fx::before{top:-26%}
.nv-icon:hover .nv-fx::after{top:-14%}
.nv-ripple{position:absolute;border-radius:50%;background:rgba(248,215,227,.5);transform:scale(0);animation:nv-ripple .75s ease-out forwards;pointer-events:none}
@keyframes nv-ripple{to{transform:scale(1);opacity:0}}
.nv-icon:focus-visible,.nv-link:focus-visible{outline:2px solid ${PRIMARY};outline-offset:3px}

/* Hamburger is mobile-only (after .nv-icon so it wins over display:flex) */
@media (min-width:768px){.nv-menu-btn{display:none}}

.nv-burger{position:relative;display:block;width:16px;height:12px}
.nv-burger i{
  position:absolute;left:0;width:100%;height:1.5px;border-radius:2px;background:currentColor;
  transition:transform .4s ${EASE},top .4s ${EASE},opacity .2s ease;
}
.nv-burger i:nth-child(1){top:0}
.nv-burger i:nth-child(2){top:5px}
.nv-burger i:nth-child(3){top:10px}
.nv-burger[data-open="true"] i:nth-child(1){top:5px;transform:rotate(45deg)}
.nv-burger[data-open="true"] i:nth-child(2){opacity:0;transform:scaleX(0)}
.nv-burger[data-open="true"] i:nth-child(3){top:5px;transform:rotate(-45deg)}

.nv-drop{animation:nv-drop .5s ${EASE} both;transform-origin:top left}
@keyframes nv-drop{
  0%{opacity:0;transform:translateY(-10px) scale(.97)}
  60%{opacity:1;transform:translateY(2px) scale(1.005)}
  100%{opacity:1;transform:none}
}

.nv-rise{animation:nv-rise .5s ${EASE} both;animation-delay:calc(var(--i, 0) * 55ms + 80ms)}
@keyframes nv-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

.nv-overlay{animation:nv-reveal .55s cubic-bezier(.65,0,.35,1) both}
@keyframes nv-reveal{from{clip-path:circle(0 at 28px 28px)}to{clip-path:circle(150% at 28px 28px)}}
.nv-overlay .nv-rise{animation-delay:calc(var(--i, 0) * 60ms + 280ms)}

.nv-pop{animation:nv-pop .45s ease-out both}
@keyframes nv-pop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}

.nv-search{background:${WHITE};border:1px solid ${LINE};transition:border-color .3s ease,box-shadow .3s ease}
.nv-search:focus-within{border-color:${INK};box-shadow:0 4px 16px rgba(45,16,40,.08)}
.nv-search input::placeholder{color:${INK_SOFT}}

/* Flowing water line under the header */
.nv-wave{position:absolute;left:0;right:0;bottom:-7px;height:8px;pointer-events:none}
.nv-wave::before,.nv-wave::after{content:'';position:absolute;inset:0;background-repeat:repeat-x;background-size:48px 8px}
.nv-wave::before{background-image:${WAVE_SVG('%23D4A017')};animation:nv-flow 6s linear infinite}
.nv-wave::after{background-image:${WAVE_SVG('%23C2185B')};opacity:.45;animation:nv-flow 9s linear infinite reverse}
@keyframes nv-flow{to{background-position-x:48px}}

@media (prefers-reduced-motion:reduce){
  .nv-enter,.nv-drop,.nv-rise,.nv-overlay,.nv-pop,
  .nv-link::before,.nv-link::after,.nv-fx::before,.nv-fx::after,
  .nv-wave::before,.nv-wave::after{animation:none}
  .nv-ripple{display:none}
  .nv-sub,.nv-icon,.nv-burger i{transition:none}
}
`;

// Click ripple for round icon buttons (expects a child <Fx />).
function ripple(e) {
  const host = e.currentTarget;
  const fx = host.querySelector('.nv-fx');
  if (!fx) return;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.detail === 0 ? rect.width / 2 : e.clientX - rect.left;
  const y = e.detail === 0 ? rect.height / 2 : e.clientY - rect.top;
  const r = document.createElement('span');
  r.className = 'nv-ripple';
  r.style.width = r.style.height = `${size}px`;
  r.style.left = `${x - size / 2}px`;
  r.style.top = `${y - size / 2}px`;
  fx.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

const Fx = () => <span className="nv-fx" aria-hidden="true" />;

// Smooth height animation for accordions (no JS measuring needed).
function Collapse({ open, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        visibility: open ? 'visible' : 'hidden',
        transition: `grid-template-rows .4s ${EASE}, visibility 0s linear ${open ? '0s' : '.4s'}`,
      }}
    >
      <div style={{ overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  );
}

function Burger({ open }) {
  return (
    <span className="nv-burger" data-open={open} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Badge({ n, className = '' }) {
  return (
    <span
      key={n}
      className={`nv-pop font-semibold rounded-full flex items-center justify-center ${className}`}
      style={{ background: PRIMARY, color: WHITE }}
    >
      {n > 9 ? '9+' : n}
    </span>
  );
}

function Chevron({ open, size = 14 }) {
  return (
    <ChevronDown
      size={size}
      strokeWidth={1.5}
      style={{
        color: INK_SOFT,
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: `transform .4s ${EASE}`,
      }}
    />
  );
}

export default function Navbar() {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [mobileEnquiryOpen, setMobileEnquiryOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const closeTimer = useRef(null);
  const enquiryTimer = useRef(null);

  const router = useRouter();
  const { count } = useCart();
  const { wishlist } = useWishlist();
  const wishlistCount = wishlist?.length || 0;

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.topLevel || []))
      .catch(() => {});
  }, []);

  // Header shadow + smaller logo after scrolling a little.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock background scroll while the full-screen mobile menu is open.
  useEffect(() => {
    if (menuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [menuOpen]);

  // Close the mobile menu if the window is resized up to desktop.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function onSearch(e) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  }

  function openShop() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShopOpen(true);
  }
  function scheduleCloseShop() {
    closeTimer.current = setTimeout(() => setShopOpen(false), 150);
  }

  function openEnquiry() {
    if (enquiryTimer.current) clearTimeout(enquiryTimer.current);
    setEnquiryOpen(true);
  }
  function scheduleCloseEnquiry() {
    enquiryTimer.current = setTimeout(() => setEnquiryOpen(false), 150);
  }

  function categoryHref(slug) {
    return `/category/${slug}`;
  }

  function closeMobileMenu() {
    setMenuOpen(false);
    setMobileShopOpen(false);
    setMobileEnquiryOpen(false);
    setMobileCatOpen(null);
  }

  const desktopLink = 'nv-link rounded-full px-4 py-2 text-[13px] font-normal tracking-[1.5px] uppercase';
  const mobileRow = 'nv-rise py-3.5 text-[14px] tracking-[1.5px] uppercase';
  const panelStyle = {
    background: WHITE,
    border: `1px solid ${LINE}`,
    boxShadow: '0 16px 36px rgba(45, 16, 40, 0.10)',
  };

  return (
    <>
      <style>{CSS}</style>

      <CouponMarquee />

      <header
        className="nv-enter sticky top-0 z-50"
        style={{
          background: WHITE,
          borderBottom: `1px solid ${LINE}`,
          boxShadow: scrolled ? '0 8px 24px rgba(45, 16, 40, 0.08)' : '0 0 0 rgba(45, 16, 40, 0)',
          transition: 'box-shadow .4s ease',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* Side columns are equal (minmax(0,1fr)) so the logo stays centered; the middle column sizes to the logo */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
            {/* Left: mobile toggle + primary links */}
            <div className="flex items-center gap-1 justify-self-start">
              <button
                className="nv-icon nv-menu-btn w-8 h-8 sm:w-10 sm:h-10"
                onClick={(e) => {
                  ripple(e);
                  setMenuOpen(true);
                }}
                aria-label="Open menu"
              >
                <Fx />
                <Burger open={false} />
              </button>

              <nav className="hidden md:flex items-center gap-1">
                <Link href="/" className={desktopLink}>
                  Home
                </Link>

                <div className="relative" onMouseEnter={openShop} onMouseLeave={scheduleCloseShop}>
                  <button className={desktopLink} data-active={shopOpen}>
                    Shop
                  </button>

                  {shopOpen && categories.length > 0 && (
                    <div className="absolute left-0 top-full pt-5" style={{ width: '560px' }}>
                      <div
                        className="nv-drop rounded-2xl py-6 px-6 max-h-[70vh] overflow-y-auto"
                        style={panelStyle}
                      >
                        <div className="[column-count:3] gap-8">
                          {categories.map((c, i) => (
                            <div
                              key={c._id}
                              className="nv-rise break-inside-avoid mb-6"
                              style={{ '--i': i }}
                            >
                              <Link
                                href={categoryHref(c.slug)}
                                onClick={() => setShopOpen(false)}
                                className="nv-link rounded-lg px-2.5 py-1 -ml-2.5 text-[13px] font-semibold tracking-wide block w-fit"
                              >
                                {c.name}
                              </Link>

                              {c.subcategories?.length > 0 && (
                                <div className="flex flex-col mt-1.5 pl-3" style={{ borderLeft: `1px solid ${LINE}` }}>
                                  {c.subcategories.map((sub) => (
                                    <Link
                                      key={sub._id}
                                      href={categoryHref(sub.slug)}
                                      onClick={() => setShopOpen(false)}
                                      className="nv-sub w-fit py-1 text-[12px] tracking-wide"
                                    >
                                      {sub.name}
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Link href="/orders" className={desktopLink}>
                  Orders
                </Link>

                {/* Enquiry dropdown */}
                <div className="relative" onMouseEnter={openEnquiry} onMouseLeave={scheduleCloseEnquiry}>
                  <button className={desktopLink} data-active={enquiryOpen}>
                    Enquiry
                  </button>

                  {enquiryOpen && (
                    <div className="absolute left-0 top-full pt-5" style={{ width: '220px' }}>
                      <div className="nv-drop rounded-2xl py-3 px-3 flex flex-col" style={panelStyle}>
                        {ENQUIRY_LINKS.map((l, i) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setEnquiryOpen(false)}
                            className="nv-link nv-rise rounded-xl px-3 py-2 text-[13px] tracking-wide w-fit"
                            style={{ '--i': i }}
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Center: logo (scaled with transform so the header height never changes).
                Mobile is 56px with vertical padding so it sits fully inside the header. */}
            <Link href="/" className="flex items-center justify-self-center py-1.5 sm:py-0">
              <div
                className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24"
                style={{
                  transform: scrolled ? 'scale(0.78)' : 'scale(1)',
                  transition: `transform .45s ${EASE}`,
                }}
              >
                <Image src="/logo.png" alt="Tirupur Clothing Hub" fill className="object-contain" priority />
              </div>
            </Link>

            {/* Right: wishlist + search + cart */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 justify-self-end">
              <Link
                href="/wishlist"
                className="nv-icon w-8 h-8 sm:w-10 sm:h-10"
                aria-label="Wishlist"
                onClick={ripple}
              >
                <Fx />
                <Heart size={15} strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <Badge
                    n={wishlistCount}
                    className="absolute -top-1 -right-1 text-[8px] sm:text-[9px] w-[15px] h-[15px] sm:w-[17px] sm:h-[17px]"
                  />
                )}
              </Link>

              <button
                className="nv-icon w-8 h-8 sm:w-10 sm:h-10"
                onClick={(e) => {
                  ripple(e);
                  setSearchOpen((v) => !v);
                }}
                aria-label="Search"
              >
                <Fx />
                <Search size={15} strokeWidth={1.5} />
              </button>

              <Link href="/cart" className="nv-icon w-8 h-8 sm:w-10 sm:h-10" aria-label="Cart" onClick={ripple}>
                <Fx />
                <ShoppingBag size={15} strokeWidth={1.5} />
                {count > 0 && (
                  <Badge
                    n={count}
                    className="absolute -top-1 -right-1 text-[8px] sm:text-[9px] w-[15px] h-[15px] sm:w-[17px] sm:h-[17px]"
                  />
                )}
              </Link>
            </div>
          </div>

          {searchOpen && (
            <form
              onSubmit={onSearch}
              className="nv-search nv-drop flex items-center gap-2.5 rounded-full px-4 py-2.5 my-2"
            >
              <Search size={15} strokeWidth={1.5} style={{ color: INK_SOFT }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search kurtis, nighties, innerwear..."
                className="bg-transparent outline-none w-full text-sm"
                style={{ color: INK }}
              />
            </form>
          )}
        </div>
        <div className="nv-wave" aria-hidden="true" />
      </header>

      {/* Mobile menu — full-screen overlay, opens as a circle from the hamburger (never on desktop) */}
      {menuOpen && (
        <div className="nv-overlay md:hidden fixed inset-0 z-[60] flex flex-col" style={{ background: WHITE }}>
          <div
            className="relative flex items-center justify-between px-6 py-3"
            style={{ borderBottom: `1px solid ${LINE}` }}
          >
            <div className="relative w-16 h-16">
              <Image src="/logo.png" alt="Tirupur Clothing Hub" fill className="object-contain" />
            </div>
            <button className="nv-icon w-10 h-10" onClick={closeMobileMenu} aria-label="Close menu">
              <Burger open />
            </button>
            <div className="nv-wave" aria-hidden="true" />
          </div>

          <nav className="flex-1 overflow-y-auto flex flex-col px-6 py-2" style={{ color: INK }}>
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={mobileRow}
              style={{ '--i': 0, borderBottom: `1px solid ${LINE}` }}
            >
              Home
            </Link>

            <div className="nv-rise" style={{ '--i': 1, borderBottom: `1px solid ${LINE}` }}>
              <button
                className="w-full flex items-center justify-between py-3.5 text-[14px] tracking-[1.5px] uppercase"
                onClick={() => setMobileShopOpen((v) => !v)}
              >
                Shop
                <Chevron open={mobileShopOpen} />
              </button>

              <Collapse open={mobileShopOpen}>
                <div className="flex flex-col pb-3">
                  {categories.map((c) => {
                    const hasSubs = c.subcategories?.length > 0;
                    const isCatOpen = mobileCatOpen === c._id;
                    return (
                      <div key={c._id} className="flex flex-col">
                        <div className="flex items-center">
                          <Link
                            href={categoryHref(c.slug)}
                            onClick={closeMobileMenu}
                            className="flex-1 py-2.5 pl-3 text-[13px] tracking-wide"
                          >
                            {c.name}
                          </Link>
                          {hasSubs && (
                            <button
                              onClick={() => setMobileCatOpen((v) => (v === c._id ? null : c._id))}
                              className="px-3 py-2.5"
                              aria-label={`Toggle ${c.name} subcategories`}
                            >
                              <Chevron open={isCatOpen} size={12} />
                            </button>
                          )}
                        </div>

                        {hasSubs && (
                          <Collapse open={isCatOpen}>
                            <div className="flex flex-col pb-1.5 ml-3" style={{ borderLeft: `1px solid ${LINE}` }}>
                              {c.subcategories.map((sub) => (
                                <Link
                                  key={sub._id}
                                  href={categoryHref(sub.slug)}
                                  onClick={closeMobileMenu}
                                  className="nv-sub py-2 pl-5 text-[12.5px] tracking-wide"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          </Collapse>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Collapse>
            </div>

            <Link
              href="/orders"
              onClick={closeMobileMenu}
              className={`${mobileRow} flex items-center justify-between`}
              style={{ '--i': 2, borderBottom: `1px solid ${LINE}` }}
            >
              <span className="flex items-center gap-2.5">
                <ClipboardList size={16} strokeWidth={1.5} />
                Orders
              </span>
            </Link>

            {/* Enquiry accordion */}
            <div className="nv-rise" style={{ '--i': 3, borderBottom: `1px solid ${LINE}` }}>
              <button
                className="w-full flex items-center justify-between py-3.5 text-[14px] tracking-[1.5px] uppercase"
                onClick={() => setMobileEnquiryOpen((v) => !v)}
              >
                Enquiry
                <Chevron open={mobileEnquiryOpen} />
              </button>

              <Collapse open={mobileEnquiryOpen}>
                <div className="flex flex-col pb-3">
                  {ENQUIRY_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={closeMobileMenu}
                      className="nv-sub py-2.5 pl-3 text-[13px] tracking-wide"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </Collapse>
            </div>

            <Link
              href="/wishlist"
              onClick={closeMobileMenu}
              className={`${mobileRow} flex items-center justify-between`}
              style={{ '--i': 4, borderBottom: `1px solid ${LINE}` }}
            >
              <span className="flex items-center gap-2.5">
                <Heart size={16} strokeWidth={1.5} />
                Wishlist
              </span>
              {wishlistCount > 0 && <Badge n={wishlistCount} className="text-[10px] min-w-[18px] h-[18px] px-1" />}
            </Link>

            <Link
              href="/cart"
              onClick={closeMobileMenu}
              className={`${mobileRow} flex items-center justify-between`}
              style={{ '--i': 5, borderBottom: `1px solid ${LINE}` }}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag size={16} strokeWidth={1.5} />
                Cart
              </span>
              {count > 0 && <Badge n={count} className="text-[10px] min-w-[18px] h-[18px] px-1" />}
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}