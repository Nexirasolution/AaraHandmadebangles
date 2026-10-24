// Cached homepage (ISR). Rendered once, then served as static HTML and
// re-built in the background at most every 5 minutes. Admin edits can show up
// instantly by calling revalidatePath('/') from the admin API routes.
// NOTE: the DB must be reachable at `next build` time (the page is generated then).
export const revalidate = 300;

import { dbConnect } from '@/lib/mongodb';
import Banner from '@/models/Banner';
import Product from '@/models/Product';
import Review from '@/models/Review';
import Combo from '@/models/Combo';
import Category from '@/models/Category';
import BannerCarousel from '@/components/BannerCarousel';
import ProductCard from '@/components/ProductCard';
import ReviewSection from '@/components/ReviewSection';

import Link from 'next/link';
import { formatINR } from '@/lib/utils';
import { resizeImage, buildSrcSet } from '@/lib/image';
import { ArrowRight, Tag } from 'lucide-react';

// Design tokens — keep in sync with Navbar, BannerCarousel and CouponMarquee.
//   Primary    #C2185B  buttons on hover, badges, links, savings
//   Secondary  #D4A017  thin rings and dividers (decorative only)
//   Background #FFF8F3  category band
//   Text       #2D1028  headings + body
//   Accent     #F8D7E3  combo band wash
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const CREAM = '#FFF8F3';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const WHITE = '#FFFFFF';

const INK_SOFT = 'rgba(45, 16, 40, 0.68)';
const HAIRLINE = 'rgba(45, 16, 40, 0.12)';
const BAND_WASH = 'rgba(248, 215, 227, 0.6)'; // accent at 60% so white cards stand out

const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const EASE = 'cubic-bezier(.22,.9,.3,1)';

const FEATURED_LIMIT = 6;

// Only the fields this page renders — keeps DB reads and the page payload small.
const COMBO_FIELDS = 'name slug type packOptions comboPrice originalPrice images image';
const CATEGORY_FIELDS = 'name slug image';
// Everything ProductCard reads. If ProductCard starts using another field,
// add it here.
const PRODUCT_FIELDS = 'name slug basePrice sleeveOptions zipOptions variants';

// Responsive image hints for the combo grid (2 cols mobile, 3 cols desktop)
const COMBO_WIDTHS = [300, 450, 700];
const COMBO_SIZES = '(max-width: 640px) 50vw, 33vw';

// Animation set (pure CSS — this is a server component, so no JS handlers):
//  · categories – tall capsule cards in a staggered (up/down) row slide past in an endless loop
//                  (pauses on hover). Each capsule bobs like it is floating on water; on hover
//                  pink water rises inside the capsule and ripple rings spread from the photo.
//  · sea        – layered waves drifting along the bottom of the category band
//  · button     – dark pill; pink water rises inside it on hover
//  · combo cards – lift with a soft shadow, image zooms
//  · "view all" – underline slides in, arrow nudges
//  · wave lines – thin flowing water line on the edges of the combo band
const WAVE_SVG = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='8' viewBox='0 0 48 8'%3E%3Cpath d='M0 4 Q12 0 24 4 T48 4' fill='none' stroke='${color}' stroke-width='1.3'/%3E%3C/svg%3E")`;

// Filled wave strip (the moving surface of the "water" inside a hovered category capsule).
const WAVE_FILL = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='12' viewBox='0 0 60 12'%3E%3Cpath d='M0 6 Q15 0 30 6 T60 6 V12 H0 Z' fill='${color}'/%3E%3C/svg%3E")`;

// Big soft wave used for the "sea" at the bottom of the category band.
const SEA_FILL = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='48' viewBox='0 0 600 48'%3E%3Cpath d='M0 24 Q150 0 300 24 T600 24 V48 H0 Z' fill='${color}'/%3E%3C/svg%3E")`;

const CSS = `
/* ───────── Category slider ─────────
   Two identical groups, the track slides left by exactly one group. */
.cw-band{position:relative;overflow:hidden;background:${CREAM}}
.cw-marquee{overflow:hidden}
.cw-track{display:flex;width:max-content;animation:cw-slide 60s linear infinite}
.cw-marquee:hover .cw-track,.cw-marquee:focus-within .cw-track{animation-play-state:paused}
.cw-group{display:flex;align-items:flex-start;flex-shrink:0;gap:20px;padding-right:20px;--stagger:28px}
@media (min-width:640px){.cw-group{gap:26px;padding-right:26px;--stagger:52px}}
@keyframes cw-slide{to{transform:translateX(-50%)}}

/* Item = one slot in the row (carries the up/down offset); bob wrapper floats inside it */
.cw-item{display:block;flex-shrink:0;border-radius:9999px}
.cw-bob{animation:cw-bob 5s ease-in-out infinite;animation-delay:calc(var(--i, 0) * -.7s)}
@keyframes cw-bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(.4deg)}}

/* The capsule */
.cw-pill{
  position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;align-items:center;
  padding:12px 12px 22px;border-radius:9999px;background:${WHITE};
  border:1px solid rgba(212,160,23,.35);
  box-shadow:0 10px 22px rgba(45,16,40,.07);
  transition:transform .5s ${EASE},box-shadow .5s ease,border-color .4s ease;
}
.cw-item:hover .cw-pill{
  transform:translateY(-6px);border-color:rgba(194,24,91,.45);
  box-shadow:0 18px 32px rgba(194,24,91,.18);
}

/* Photo oval with thin gold ring (decorative) + ripple rings */
.cw-photo{position:relative;width:100%;aspect-ratio:4/5;border-radius:50%;padding:4px;
  background:${WHITE};box-shadow:0 0 0 1px rgba(212,160,23,.55)}
.cw-photo img,.cw-photo .cw-ph{position:absolute;inset:4px;width:calc(100% - 8px);height:calc(100% - 8px);
  border-radius:50%;object-fit:cover;transition:transform .8s ${EASE}}
.cw-item:hover .cw-photo img{transform:scale(1.07)}
.cw-photo::before,.cw-photo::after{
  content:'';position:absolute;inset:0;border-radius:50%;border:1.5px solid ${PRIMARY};
  opacity:0;pointer-events:none;
}
.cw-item:hover .cw-photo::before{animation:cw-ripple 2.2s ease-out infinite}
.cw-item:hover .cw-photo::after{animation:cw-ripple 2.2s ease-out .9s infinite}
@keyframes cw-ripple{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.28);opacity:0}}

/* Name + arrow */
.cw-name{
  display:block;margin-top:18px;text-align:center;color:${INK};
  font-size:13px;font-weight:700;line-height:1.25;letter-spacing:.2px;
  transition:color .25s ease;
}
@media (min-width:640px){.cw-name{font-size:15px;margin-top:22px}}
.cw-arrow{margin-top:10px;color:${INK_SOFT};transition:transform .4s ${EASE},color .25s ease}
.cw-item:hover .cw-name,.cw-item:hover .cw-arrow{color:${PRIMARY}}
.cw-item:hover .cw-arrow{transform:translateX(5px)}
.cw-item:focus-visible{outline:2px solid ${PRIMARY};outline-offset:4px}

/* Water inside the capsule: two layers rise to different levels, surfaces drift in opposite directions.
   Sits behind the photo and text (z-index -1) so everything stays readable. */
.cw-water{
  position:absolute;inset:0;z-index:-1;pointer-events:none;background:${ACCENT};opacity:.85;
  transform:translateY(105%);transition:transform 1.1s ${EASE};
}
.cw-water::before{
  content:'';position:absolute;left:0;right:0;top:-11px;height:12px;
  background-image:${WAVE_FILL('%23F8D7E3')};background-repeat:repeat-x;background-size:60px 12px;
  animation:cw-flow 4s linear infinite;
}
.cw-water-b{background:${PRIMARY};opacity:.22;transition-delay:.06s}
.cw-water-b::before{background-image:${WAVE_FILL('%23C2185B')};animation:cw-flow 6s linear infinite reverse}
.cw-item:hover .cw-water{transform:translateY(38%)}
.cw-item:hover .cw-water-b{transform:translateY(52%)}
@keyframes cw-flow{to{background-position-x:60px}}

/* Sea along the bottom of the band — the front layer is white so it melts into the next section */
.cw-sea{position:absolute;left:0;right:0;bottom:0;height:48px;pointer-events:none}
.cw-sea i{position:absolute;left:0;right:0;bottom:0;background-repeat:repeat-x;background-size:600px 48px}
.cw-sea i:nth-child(1){height:48px;background-image:${SEA_FILL('%23F8D7E3')};opacity:.9;animation:cw-drift 22s linear infinite}
.cw-sea i:nth-child(2){height:36px;background-image:${SEA_FILL('%23C2185B')};opacity:.10;animation:cw-drift 30s linear infinite reverse}
.cw-sea i:nth-child(3){height:24px;background-image:${SEA_FILL('%23FFFFFF')};animation:cw-drift 16s linear infinite}
@keyframes cw-drift{to{background-position-x:600px}}

.hp-btn{
  position:relative;isolation:isolate;overflow:hidden;display:inline-flex;align-items:center;gap:10px;
  border-radius:9999px;background:${INK};color:${WHITE};
  transition:transform .3s ${EASE},box-shadow .3s ease;
}
.hp-btn::before,.hp-btn::after{
  content:'';position:absolute;left:calc(50% - 180px);top:105%;width:360px;height:360px;border-radius:42%;
  z-index:-1;pointer-events:none;transition:top .8s ${EASE};
}
.hp-btn::before{background:rgba(194,24,91,.55);animation:hp-spin 8s linear infinite}
.hp-btn::after{background:${PRIMARY};animation:hp-spin 6s linear infinite reverse}
.hp-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(194,24,91,.25)}
.hp-btn:hover::before{top:calc(50% - 212px)}
.hp-btn:hover::after{top:calc(50% - 196px)}
.hp-btn:active{transform:translateY(0) scale(.97)}
.hp-btn .hp-arrow{transition:transform .35s ${EASE}}
.hp-btn:hover .hp-arrow{transform:translateX(4px)}
.hp-btn:focus-visible,.hp-more:focus-visible{outline:2px solid ${PRIMARY};outline-offset:3px}
@keyframes hp-spin{to{transform:rotate(360deg)}}

.hp-more{position:relative;display:inline-flex;align-items:center;gap:6px;color:${PRIMARY};padding-bottom:2px}
.hp-more::after{
  content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:${PRIMARY};
  transform:scaleX(0);transform-origin:right;transition:transform .4s ${EASE};
}
.hp-more:hover::after{transform:scaleX(1);transform-origin:left}
.hp-more .hp-arrow{transition:transform .35s ${EASE}}
.hp-more:hover .hp-arrow{transform:translateX(4px)}

.hp-card{
  background:${WHITE};border:1px solid ${HAIRLINE};border-radius:20px;overflow:hidden;
  transition:transform .45s ${EASE},box-shadow .45s ease,border-color .3s ease;
}
.hp-card:hover{
  transform:translateY(-4px);border-color:rgba(194,24,91,.35);
  box-shadow:0 18px 36px rgba(45,16,40,.12);
}
.hp-card:focus-visible{outline:2px solid ${PRIMARY};outline-offset:3px}

.hp-wave{position:absolute;left:0;right:0;height:8px;pointer-events:none}
.hp-wave-top{top:-4px}
.hp-wave-bottom{bottom:-4px}
.hp-wave::before,.hp-wave::after{content:'';position:absolute;inset:0;background-repeat:repeat-x;background-size:48px 8px}
.hp-wave::before{background-image:${WAVE_SVG('%23D4A017')};animation:hp-flow 6s linear infinite}
.hp-wave::after{background-image:${WAVE_SVG('%23C2185B')};opacity:.45;animation:hp-flow 9s linear infinite reverse}
@keyframes hp-flow{to{background-position-x:48px}}

@media (prefers-reduced-motion:reduce){
  .hp-btn::before,.hp-btn::after,.hp-wave::before,.hp-wave::after{animation:none}
  .cw-track,.cw-bob,.cw-water::before,.cw-sea i,.cw-item:hover .cw-photo::before,.cw-item:hover .cw-photo::after{animation:none}
  .cw-marquee{overflow-x:auto;-webkit-mask-image:none!important;mask-image:none!important}
  .cw-pill,.cw-photo img,.cw-water,.cw-arrow{transition:none}
  .hp-btn,.hp-btn .hp-arrow,.hp-more::after,.hp-more .hp-arrow,.hp-card{transition:none}
}
`;

// ProductCard only displays the FIRST variant and its FIRST image, so don't
// ship every colour/image of every product into the page HTML.
function slimProduct(p) {
  const v = p.variants?.[0];
  return {
    ...p,
    variants: v ? [{ ...v, images: (v.images || []).slice(0, 1) }] : [],
  };
}

async function getData() {
  await dbConnect();
  const [banners, newArrivals, reviews, combos, categories] = await Promise.all([
    Banner.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    Product.find({ isActive: true, isActiveSeller: true })
      .sort({ createdAt: -1 })
      .limit(FEATURED_LIMIT)
      .select(PRODUCT_FIELDS)
      .lean(),
    Review.find({ isApproved: true, isFeatured: true }).populate('product', 'name').limit(10).lean(),
    Combo.find({ isActive: true }).select(COMBO_FIELDS).limit(6).lean(),
    Category.find({ isActive: true, parent: null }).select(CATEGORY_FIELDS).limit(10).lean(),
  ]);

  // One serialization pass (ObjectId / Date -> plain JSON for client components).
  return JSON.parse(
    JSON.stringify({
      banners,
      newArrivals: newArrivals.map(slimProduct),
      reviews,
      combos,
      categories,
    })
  );
}

function SectionTitle({ children, size = 'lg' }) {
  return (
    <>
      <h2
        className={`${size === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} font-bold tracking-[3px] uppercase text-center`}
        style={{ color: INK, fontFamily: FONT_SANS }}
      >
        {children}
      </h2>
      <div className="flex items-center justify-center gap-3 mt-4">
        <span style={{ width: '28px', height: '1px', background: HAIRLINE }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
        <span style={{ width: '28px', height: '1px', background: HAIRLINE }} />
      </div>
    </>
  );
}

export default async function HomePage() {
  const { banners, newArrivals, reviews, combos, categories } = await getData();

  // Category slider: repeat the list until one group is wider than any screen,
  // then render the group twice so the loop is seamless.
  // The group length is kept EVEN so the up/down stagger continues unbroken across the loop seam.
  let reps = categories.length ? Math.ceil(12 / categories.length) : 0;
  if (categories.length && (reps * categories.length) % 2 === 1) reps += 1;
  const catLoop = Array.from({ length: reps }).flatMap(() => categories);
  const slideSeconds = catLoop.length * 4; // slower, calmer drift
  const fade = 'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)';

  return (
    <div className="overflow-x-hidden" style={{ background: WHITE, color: INK }}>
      <style>{CSS}</style>

      {/* Banner */}
      <BannerCarousel banners={banners} />

      {/* Shop by Category — cream band, staggered capsule cards, water animation */}
      {categories.length > 0 && (
        <section className="cw-band">
          <div className="max-w-6xl mx-auto px-4 pt-14">
            <SectionTitle>Shop by Category</SectionTitle>
          </div>

          <div
            className="cw-marquee mt-8 pt-3 pb-24"
            style={{ WebkitMaskImage: fade, maskImage: fade }}
          >
            <div className="cw-track" style={{ animationDuration: `${slideSeconds}s` }}>
              {[0, 1].map((g) => (
                <div key={g} className="cw-group" aria-hidden={g === 1 ? true : undefined}>
                  {catLoop.map((c, i) => (
                    <Link
                      key={`${g}-${i}`}
                      href={`/category/${c.slug}`}
                      className="cw-item w-[132px] sm:w-[160px] md:w-[184px]"
                      style={{ marginTop: i % 2 ? 'var(--stagger)' : 0 }}
                      tabIndex={g === 1 ? -1 : undefined}
                    >
                      <div className="cw-bob" style={{ '--i': i }}>
                        <div className="cw-pill">
                          <div className="cw-photo">
                            {c.image ? (
                              <img
                                // ~170px wide oval -> 360x450 crop covers retina screens
                                src={resizeImage(c.image, 360, 450)}
                                alt={g === 1 ? '' : c.name}
                                width={180}
                                height={225}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="cw-ph" style={{ background: ACCENT }} />
                            )}
                          </div>

                          <span className="cw-name line-clamp-2" style={{ fontFamily: FONT_SANS }}>
                            {c.name}
                          </span>
                          <ArrowRight size={18} strokeWidth={1.6} className="cw-arrow" />

                          {/* rising water, behind everything */}
                          <span className="cw-water" aria-hidden="true" />
                          <span className="cw-water cw-water-b" aria-hidden="true" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* drifting sea along the bottom edge */}
          <div className="cw-sea" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </section>
      )}

      {/* Featured collection */}
      <section className="max-w-6xl mx-auto px-4 pt-14 pb-16 text-center">
        <SectionTitle size="md">Featured Collection</SectionTitle>

        {newArrivals.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 mt-8 text-left">
            {newArrivals.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}

        <Link
          href="/products"
          className="hp-btn mt-10 px-8 py-3.5 text-[12px] font-bold tracking-[2px] uppercase"
          style={{ fontFamily: FONT_SANS }}
        >
          Shop the collection
          <ArrowRight size={14} className="hp-arrow" />
        </Link>
      </section>

      {/* Combo Offers */}
      {combos.length > 0 && (
        <section className="relative py-16" style={{ background: BAND_WASH }}>
          <div className="hp-wave hp-wave-top" aria-hidden="true" />
          <div className="hp-wave hp-wave-bottom" aria-hidden="true" />

          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col items-center text-center mb-10">
              <span
                className="text-[11px] font-bold uppercase tracking-[3px] mb-3 px-3.5 py-1 rounded-full"
                style={{ color: WHITE, background: PRIMARY, fontFamily: FONT_SANS }}
              >
                Save More
              </span>
              <h2
                className="text-xl sm:text-2xl font-bold tracking-[1px]"
                style={{ color: INK, fontFamily: FONT_SANS }}
              >
                Combo Offers
              </h2>
              <p className="text-sm mt-1 font-light" style={{ color: INK_SOFT, fontFamily: FONT_SANS }}>
                Buy together, save together
              </p>
              <Link
                href="/combos"
                className="hp-more hidden sm:inline-flex text-sm font-bold mt-3"
                style={{ fontFamily: FONT_SANS }}
              >
                View all <ArrowRight size={14} className="hp-arrow" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {combos.map((c) => {
                const isColorPack = c.type === 'color-pack';
                const cheapestPack = isColorPack && c.packOptions?.length
                  ? c.packOptions.reduce((min, p) => (p.price < min.price ? p : min), c.packOptions[0])
                  : null;

                const cover = c.images?.[0] || c.image;

                const displayPrice = isColorPack ? cheapestPack?.price ?? 0 : c.comboPrice;
                const displayOriginal = isColorPack ? cheapestPack?.originalPrice ?? 0 : c.originalPrice;
                const savings = displayOriginal > displayPrice ? displayOriginal - displayPrice : 0;
                const pct = displayOriginal > 0 ? Math.round((savings / displayOriginal) * 100) : 0;

                return (
                  <Link key={c._id} href={`/combo/${c.slug}`} className="hp-card group relative block">
                    <div className="relative w-full aspect-square overflow-hidden" style={{ background: CREAM }}>
                      {cover ? (
                        <img
                          src={resizeImage(cover, 450)}
                          srcSet={buildSrcSet(cover, COMBO_WIDTHS)}
                          sizes={COMBO_SIZES}
                          alt={c.name}
                          width={450}
                          height={450}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: ACCENT }} />
                      )}
                      {pct > 0 && (
                        <div
                          className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{ color: WHITE, background: PRIMARY, fontFamily: FONT_SANS }}
                        >
                          <Tag size={9} /> {pct}% off
                        </div>
                      )}
                      {isColorPack && (
                        <div
                          className="absolute top-2.5 right-2.5 text-[10px] font-medium px-2.5 py-1 rounded-full"
                          style={{ background: INK, color: WHITE }}
                        >
                          Color Pack
                        </div>
                      )}
                    </div>

                    <div className="p-3.5" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                      <p
                        className="text-[13px] font-bold tracking-wide line-clamp-1"
                        style={{ color: INK, fontFamily: FONT_SANS }}
                      >
                        {c.name}
                      </p>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="font-bold text-sm" style={{ color: INK, fontFamily: FONT_SANS }}>
                          {isColorPack && 'From '}{formatINR(displayPrice)}
                        </span>
                        {savings > 0 && (
                          <span
                            className="text-[11px] line-through font-light"
                            style={{ color: INK_SOFT, fontFamily: FONT_SANS }}
                          >
                            {formatINR(displayOriginal)}
                          </span>
                        )}
                      </div>
                      {savings > 0 && (
                        <p
                          className="text-[10.5px] font-bold mt-1 tracking-wide uppercase"
                          style={{ color: PRIMARY, fontFamily: FONT_SANS }}
                        >
                          Save {formatINR(savings)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/combos" className="hp-more text-sm font-bold" style={{ fontFamily: FONT_SANS }}>
                View all combos <ArrowRight size={14} className="hp-arrow" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <ReviewSection reviews={reviews} />
    </div>
  );
}