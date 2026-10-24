import './globals.css';
import { Playfair_Display, Poppins } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WhishlistContext';
// import BottomNav from '@/components/BottomNav';
import { dbConnect } from '@/lib/mongodb';
import Settings from '@/models/Settings';

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'] });
const body = Poppins({ subsets: ['latin'], variable: '--font-body', weight: ['300', '400', '500', '600', '700'] });

const DEFAULT_SITE_URL = 'https://srivilvahclothing.co.in';

// Always returns a valid absolute URL object, even if the env var
// is missing the protocol (e.g. "srivilvahclothing.co.in" or "localhost:3000").
function getSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export async function generateMetadata() {
  let settings = null;
  try {
    await dbConnect();
    settings = await Settings.findOne({ key: 'global' });
  } catch {
    settings = null;
  }

  const title = settings?.seoTitle || 'Sri Vilvah Clothings - Women Kurtis, Nighties & More';
  const description =
    settings?.seoDescription ||
    'Shop authentic women kurtis, nighties, innerwear and trending collections online from Sri Vilvah Clothings.';

  return {
    title: { default: title, template: '%s | Sri Vilvah Clothings' },
    description,
    metadataBase: getSiteUrl(),
    keywords: ['women kurtis online', 'nighties online', 'innerwear online', 'Sri Vilvah Clothings', 'women fashion'],
    openGraph: { title, description, siteName: 'Sri Vilvah Clothings', type: 'website' },
    icons: { icon: '/favicon.ico' },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} font-body antialiased`}
        style={{ background: '#fdf5f5' }}
      >
        <CartProvider>
          <WishlistProvider>
            {children}

            {/* spacer so page content isn't hidden behind the fixed mobile nav */}
            <div className="md:hidden h-16" />

            {/* <BottomNav /> */}
          </WishlistProvider>
        </CartProvider>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
              background: '#fff',
              color: '#8B0000',
              border: '1.5px solid #C9A84C',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
            },
            success: {
              iconTheme: {
                primary: '#8B0000',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#C9A84C',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}