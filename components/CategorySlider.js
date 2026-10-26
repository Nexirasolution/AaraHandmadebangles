'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { resizeImage } from '@/lib/image';

const SPEED = 40;          // px per second (auto-scroll)
const RESUME_DELAY = 1800; // ms after the last user interaction before auto-scroll resumes
const ACCENT = '#F8D7E3';
const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function CategorySlider({ categories }) {
  const scroller = useRef(null);

  // Repeat the list until one group is wider than any screen; keep the length EVEN
  // so the up/down stagger continues unbroken across group seams.
  let reps = categories.length ? Math.ceil(12 / categories.length) : 0;
  if (categories.length && (reps * categories.length) % 2 === 1) reps += 1;
  const loop = Array.from({ length: reps }).flatMap(() => categories);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !loop.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 3 identical groups: we always stay inside the middle one and jump by one
    // group width when we leave it, so the loop is seamless in BOTH directions.
    const groupW = () => el.scrollWidth / 3;

    let pos = groupW(); // float position (browsers round scrollLeft)
    el.scrollLeft = pos;

    let hoverPause = false;
    let touchPause = false;
    let dragging = false;
    let resumeAt = 0;
    let raf = 0;
    let last = performance.now();

    const bumpResume = () => { resumeAt = performance.now() + RESUME_DELAY; };

    const wrap = () => {
      const w = groupW();
      if (!w) return;
      if (el.scrollLeft >= w * 2) { el.scrollLeft -= w; pos = el.scrollLeft; }
      else if (el.scrollLeft <= 0) { el.scrollLeft += w; pos = el.scrollLeft; }
    };

    const tick = (now) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;

      const paused = hoverPause || touchPause || dragging || now < resumeAt;
      if (!paused && !reduceMotion) {
        // if the user moved it (scroll/drag/keys), re-sync our float position
        if (Math.abs(el.scrollLeft - pos) > 1.5) pos = el.scrollLeft;
        pos += SPEED * dt;
        el.scrollLeft = pos;
        wrap();
      }
      raf = requestAnimationFrame(tick);
    };

    // ── user input ──
    const onScroll = () => { wrap(); };
    const onWheel = () => bumpResume();
    const onTouchStart = () => { touchPause = true; };
    const onTouchEnd = () => { touchPause = false; bumpResume(); };
    const onEnter = (e) => { if (e.pointerType === 'mouse') hoverPause = true; };
    const onLeave = (e) => { if (e.pointerType === 'mouse') { hoverPause = false; bumpResume(); } };
    const onFocusIn = () => { hoverPause = true; };
    const onFocusOut = () => { hoverPause = false; bumpResume(); };

    // mouse drag-to-scroll (touch already scrolls natively)
    let startX = 0, startScroll = 0, moved = false;
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = false;
      startX = e.clientX; startScroll = el.scrollLeft;
      el.classList.add('is-dragging');
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
      pos = el.scrollLeft;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-dragging');
      bumpResume();
    };
    // don't follow the link if the user was dragging
    const onClickCapture = (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('click', onClickCapture, true);

    // keep position valid when the layout changes (resize / image load)
    const onResize = () => { pos = groupW(); el.scrollLeft = pos; };
    window.addEventListener('resize', onResize);

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('resize', onResize);
    };
  }, [loop.length]);

  if (!loop.length) return null;

  const fade = 'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)';

  return (
    <div
      ref={scroller}
      className="cw-marquee mt-8 pt-3 pb-24"
      style={{ WebkitMaskImage: fade, maskImage: fade }}
      tabIndex={-1}
    >
      <div className="cw-track">
        {[0, 1, 2].map((g) => (
          <div key={g} className="cw-group" aria-hidden={g !== 1 ? true : undefined}>
            {loop.map((c, i) => (
              <Link
                key={`${g}-${i}`}
                href={`/category/${c.slug}`}
                draggable={false}
                className="cw-item w-[132px] sm:w-[160px] md:w-[184px]"
                style={{ marginTop: i % 2 ? 'var(--stagger)' : 0 }}
                tabIndex={g !== 1 ? -1 : undefined}
              >
                <div className="cw-bob" style={{ '--i': i }}>
                  <div className="cw-pill">
                    <div className="cw-photo">
                      {c.image ? (
                        <img
                          src={resizeImage(c.image, 360, 450)}
                          alt={g !== 1 ? '' : c.name}
                          width={180}
                          height={225}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      ) : (
                        <div className="cw-ph" style={{ background: ACCENT }} />
                      )}
                    </div>

                    <span className="cw-name line-clamp-2" style={{ fontFamily: FONT_SANS }}>
                      {c.name}
                    </span>
                    <ArrowRight size={18} strokeWidth={1.6} className="cw-arrow" />

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
  );
}