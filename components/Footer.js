import { MapPin } from 'lucide-react';
import { Fraunces, Inter } from 'next/font/google';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';
import FooterLinks from './FooterLinks';

const display = Fraunces({ subsets: ['latin'], weight: ['700'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body' });

// Design tokens — keep in sync with the homepage, Navbar, CouponMarquee and FooterLinks.
//   Primary    #C2185B  hover colour, pin icon
//   Secondary  #D4A017  thin rings and dividers (decorative only)
//   Background #C2185B  footer body (white text on top)
//   Text       #2D1028  headings + body, bottom bar
//   Accent     #F8D7E3  pills, bottom-bar text
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const WHITE = '#FFFFFF';

const WHITE_SOFT = 'rgba(255, 255, 255, 0.88)'; // soft white text on the pink footer

async function getCategories() {
  await dbConnect();
  const categories = await Category.find({}).select('name slug').lean();
  return JSON.parse(JSON.stringify(categories));
}

export default async function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP || '918778695195';
  const phoneDisplay = '+91 87786 95195';
  const email = 'shalu199631@gmail.com';
  const instagram =
    process.env.NEXT_PUBLIC_INSTAGRAM ||
    'https://www.instagram.com/aara_handmade_bangles';
  const categories = await getCategories();

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/products' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Bulk Order Enquiry', href: '/bulk-enquiry' },
    // { label: 'Contact', href: '/contact' },
  ];

  return (
    <footer
      className={`${body.className} mt-16`}
      style={{ background: PRIMARY, borderTop: `1px solid ${GOLD}` }}
    >
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-12 gap-10 sm:gap-8">

        {/* Brand column */}
        <div className="sm:col-span-4">
          <h3 className={`${display.className} text-2xl leading-tight mb-4`} style={{ color: WHITE, fontWeight: 700 }}>
            Aara Creation
          </h3>

          <p className="flex items-start gap-1.5 text-xs font-medium leading-relaxed" style={{ color: WHITE_SOFT }}>
            <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
            <span>
              No. 95, Thiruvallur Street,<br />
              Mettu Mangalam, Thirukazhukundram,<br />
              Chengalpattu District, Tamil Nadu 603109
            </span>
          </p>

          <p
            className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
            style={{ color: INK, background: ACCENT }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIMARY }} />
            Online sales only
          </p>
        </div>

        {/* Shop / Quick Links / Connect — accordion on mobile, columns on desktop */}
        <FooterLinks
          categories={categories}
          quickLinks={quickLinks}
          whatsapp={whatsapp}
          phoneDisplay={phoneDisplay}
          email={email}
          instagram={instagram}
        />
      </div>

      {/* Bottom bar — dark, rounded top corners, bookends the coupon marquee */}
      <div
        className="rounded-t-[24px]"
        style={{ background: INK, borderTop: `1px solid ${GOLD}` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] font-medium" style={{ color: ACCENT }}>
            © {new Date().getFullYear()} Aara Handmade Bangles. All rights reserved.
          </p>

          <a
            href="https://www.nexirasolution.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-medium transition-opacity hover:opacity-75"
            style={{ color: ACCENT }}
          >
            Designed and developed by
            <span className="font-bold text-[11px] tracking-wide" style={{ color: WHITE }}>
              Nexira Solution
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}