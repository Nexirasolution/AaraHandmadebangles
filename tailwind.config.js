/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      animation: {
        marquee: 'marquee 22s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      // Palette (new theme)
      //   Primary    #C2185B  buttons on hover, badges, links, savings, active states
      //   Secondary  #D4A017  thin rings and dividers (decorative only)
      //   Background #FFF8F3  soft bands (pages themselves are pure white)
      //   Text       #2D1028  headings + body, dark buttons
      //   Accent     #F8D7E3  washes, focus rings, soft badges
      //
      // The original key names are kept so any existing `bg-brand-*` /
      // `text-brand-*` classes keep working and pick up the new palette.
      colors: {
        brand: {
          // ── New semantic names (use these in new code) ──
          primary: '#C2185B',
          secondary: '#D4A017',
          background: '#FFF8F3',
          text: '#2D1028',
          accent: '#F8D7E3',

          // ── Original keys, remapped ──
          pink: '#C2185B',       // primary
          magenta: '#C2185B',    // primary brand color (wordmark, CTAs, prices)
          rose: '#2D1028',       // hover/secondary tone — deep text colour
          green: '#F8D7E3',      // neutral accent slot is now the soft pink accent
          deepgreen: '#2D1028',  // darkest tone
          gold: '#D4A017',       // secondary — decorative rings and dividers only
          cream: '#FFF8F3',      // soft band background
          ink: '#2D1028',        // text color

          // ── Helpers carried over from the navy/gold theme ──
          navy: '#C2185B',       // was primary navy → primary pink
          navydark: '#2D1028',   // was deep navy → text colour
          goldpale: '#F8D7E3',   // was pale gold → accent
          goldwash: '#FFF8F3',   // tint for hovers and placeholders
          inksoft: 'rgba(45, 16, 40, 0.72)', // secondary text
          line: 'rgba(45, 16, 40, 0.12)'     // hairline borders
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)']
      },
      boxShadow: {
        soft: '0 8px 30px -8px rgba(45, 16, 40, 0.15)',
        card: '0 18px 36px rgba(45, 16, 40, 0.12)',
        glow: '0 10px 24px rgba(194, 24, 91, 0.25)'
      },
      borderRadius: {
        xl2: '1.25rem',   // 20px — cards
        xl3: '1.5rem'     // 24px — summary cards, form cards
      }
    }
  },
  plugins: []
};