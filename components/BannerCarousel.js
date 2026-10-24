'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Palette — keep in sync with Navbar and CouponMarquee.
// Primary #C2185B · Secondary #D4A017 · Background #FFF8F3 · Text #2D1028 · Accent #F8D7E3
const PRIMARY = '#C2185B';
const INK = '#2D1028';
const CREAM = '#FFF8F3';
const WHITE = '#FFFFFF';
const LINE = 'rgba(45, 16, 40, 0.12)';

const SLIDE_MS = 4500;
const EASE = 'cubic-bezier(.22,.9,.3,1)';

// Animation set:
//  · slides   – crossfade with a gentle zoom-out settle
//  · arrows   – dark water rises inside the circle on hover (same as Navbar icons)
//  · dots     – the active dot is a pill that fills with pink over the slide time
const CSS = `
.bn-arrow{
  position:absolute;top:50%;z-index:10;isolation:isolate;overflow:hidden;
  display:flex;align-items:center;justify-content:center;border-radius:9999px;
  background:rgba(255,255,255,.92);color:${INK};border:1px solid ${LINE};
  box-shadow:0 4px 14px rgba(45,16,40,.12);
  transform:translateY(-50%);
  transition:color .3s ease,border-color .3s ease,transform .3s ${EASE};
}
.bn-arrow::before,.bn-arrow::after{
  content:'';position:absolute;left:-50%;top:105%;width:200%;height:200%;border-radius:42%;
  z-index:-1;pointer-events:none;transition:top .8s ${EASE};
}
.bn-arrow::before{background:rgba(194,24,91,.35);animation:bn-spin 8s linear infinite}
.bn-arrow::after{background:${INK};animation:bn-spin 6s linear infinite reverse}
.bn-arrow:hover{
  color:${WHITE};border-color:${INK};
  transition:color .3s ease .3s,border-color .3s ease,transform .3s ${EASE};
}
.bn-arrow:hover::before{top:-26%}
.bn-arrow:hover::after{top:-14%}
.bn-arrow:active{transform:translateY(-50%) scale(.92)}
.bn-arrow:focus-visible,.bn-dot:focus-visible{outline:2px solid ${PRIMARY};outline-offset:3px}
.bn-prev:hover svg{animation:bn-nudge-l .5s ${EASE}}
.bn-next:hover svg{animation:bn-nudge-r .5s ${EASE}}
@keyframes bn-spin{to{transform:rotate(360deg)}}
@keyframes bn-nudge-l{50%{transform:translateX(-3px)}}
@keyframes bn-nudge-r{50%{transform:translateX(3px)}}

.bn-fill{transform-origin:left;transform:scaleX(0);animation:bn-progress ${SLIDE_MS}ms linear forwards}
@keyframes bn-progress{to{transform:scaleX(1)}}

@media (prefers-reduced-motion:reduce){
  .bn-arrow,.bn-arrow::before,.bn-arrow::after{transition:none;animation:none}
  .bn-prev:hover svg,.bn-next:hover svg{animation:none}
  .bn-fill{animation:none;transform:scaleX(1)}
  .bn-slide{transition:none!important}
}
`;

const pad = (n) => String(n).padStart(2, '0');

export default function BannerCarousel({ banners }) {
  const count = banners?.length || 0;
  const [index, setIndex] = useState(0);
  // Bumped when the tab becomes visible again, so the progress pill restarts
  // in step with the auto-advance timer.
  const [cycle, setCycle] = useState(0);
  // Slides whose <img> has been mounted. Only the current slide and the next
  // one are mounted up front, so banners 3+ are not downloaded until needed.
  const [seen, setSeen] = useState(() => new Set([0]));

  // Mount the current slide and pre-load the next one.
  useEffect(() => {
    if (count < 2) return;
    setSeen((prev) => {
      const next = (index + 1) % count;
      if (prev.has(index) && prev.has(next)) return prev;
      const s = new Set(prev);
      s.add(index);
      s.add(next);
      return s;
    });
  }, [index, count]);

  // Auto-advance. Depends on `index`, so a manual click restarts the timer.
  // Paused while the tab is hidden and skipped entirely for users who prefer
  // reduced motion — no wasted work in the background.
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let t;
    const start = () => {
      clearTimeout(t);
      t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    };
    const onVisibility = () => {
      if (document.hidden) {
        clearTimeout(t);
      } else {
        setCycle((c) => c + 1);
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [index, count]);

  if (!count) return null;

  return (
    <section className="w-full" style={{ background: CREAM }}>
      <style>{CSS}</style>

      {/* Inset rounded card instead of a full-bleed strip */}
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 py-3 sm:py-6">
        {/*
          One image for all screen sizes (recommended upload: 1920 x 810 px).
          The box keeps the same aspect ratio on every device, so on mobile it
          simply scales down and the WHOLE image stays visible.
          - mobile:  object-contain -> never crops, even if the ratio is slightly off
          - desktop: object-cover   -> fills the box edge to edge
        */}
        <div
          className="relative w-full aspect-[1920/810] overflow-hidden rounded-2xl sm:rounded-[28px]"
          style={{
            background: WHITE,
            border: `1px solid ${LINE}`,
            boxShadow: '0 18px 40px rgba(45, 16, 40, 0.10)',
          }}
        >
          {banners.map((b, i) => {
            const isFirst = i === 0;
            const active = i === index;
            return (
              <Link
                key={b._id}
                href={b.link || '#'}
                className={`bn-slide absolute inset-0 block ${
                  active && b.link ? '' : 'pointer-events-none'
                }`}
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? 'scale(1)' : 'scale(1.05)',
                  transition: `opacity .9s ease, transform 1.4s ${EASE}`,
                }}
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
              >
                {(isFirst || seen.has(i)) && (
                  <img
                    src={b.image}
                    alt={b.title || 'Banner'}
                    width={1920}
                    height={810}
                    // First banner is the page's largest paint: load it at once
                    // with high priority. The rest load lazily, only when mounted.
                    loading={isFirst ? 'eager' : 'lazy'}
                    fetchPriority={isFirst ? 'high' : 'auto'}
                    decoding={isFirst ? 'sync' : 'async'}
                    className="absolute inset-0 w-full h-full object-contain object-center sm:object-cover"
                  />
                )}
              </Link>
            );
          })}

          {count > 1 && (
            <>
              <button
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
                className="bn-arrow bn-prev left-2 sm:left-5 w-8 h-8 sm:w-11 sm:h-11"
                aria-label="Previous"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % count)}
                className="bn-arrow bn-next right-2 sm:right-5 w-8 h-8 sm:w-11 sm:h-11"
                aria-label="Next"
              >
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>

              {/* Slide counter (desktop) */}
              <div
                className="hidden sm:block absolute bottom-5 left-6 z-10 rounded-full px-3.5 py-1.5 text-[11px] tracking-[1.5px] tabular-nums"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  color: INK,
                  border: `1px solid ${LINE}`,
                }}
                aria-hidden="true"
              >
                {pad(index + 1)} / {pad(count)}
              </div>

              {/* Pill indicators — the active one fills with pink over the slide time */}
              <div
                className="absolute bottom-2 sm:bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full px-3 sm:px-4 backdrop-blur-sm"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: `1px solid ${LINE}`,
                }}
              >
                {banners.map((_, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className="bn-dot flex items-center py-2 sm:py-2.5 rounded-full"
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={active}
                    >
                      <span
                        className="relative block overflow-hidden rounded-full"
                        style={{
                          height: '6px',
                          width: active ? '32px' : '6px',
                          background: 'rgba(45, 16, 40, 0.2)',
                          transition: `width .5s ${EASE}`,
                        }}
                      >
                        {active && (
                          <span
                            key={`${index}-${cycle}`}
                            className="bn-fill absolute inset-0 block rounded-full"
                            style={{ background: PRIMARY }}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}