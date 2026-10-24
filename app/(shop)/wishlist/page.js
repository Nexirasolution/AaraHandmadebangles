'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/components/WhishlistContext';
import ProductCard from '@/components/ProductCard';

// Design tokens — keep in sync with the homepage, ProductCard, CartPage and Footer.
//   Primary    #C2185B  heart icon, button hover
//   Secondary  #D4A017  thin divider (decorative only)
//   Background #FFFFFF  pure white page
//   Text       #2D1028  headings + body, dark buttons
//   Accent     #F8D7E3  loading placeholders
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const PAPER = '#FFFFFF';
const SKELETON = 'rgba(248, 215, 227, 0.45)'; // loading placeholders on white

const INK_SOFT = 'rgba(45, 16, 40, 0.72)';
const LINE = 'rgba(45, 16, 40, 0.12)';
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

export default function WishlistPage() {
  const { wishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchProducts() {
      if (!wishlist?.length) {
        if (active) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/products/by-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: wishlist })
        });
        const data = await res.json();
        if (active) setProducts(data.products || []);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      active = false;
    };
  }, [wishlist]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16 min-h-[60vh]" style={{ background: PAPER }}>
      <div className="mb-10">
        <h1 className="text-[24px] sm:text-[28px] font-bold" style={{ fontFamily: FONT_SERIF, color: INK }}>
          My Wishlist
        </h1>
        <div className="mt-3 mb-3 h-[2px] w-12 rounded-full" style={{ background: GOLD }} />
        <p className="text-sm font-medium" style={{ color: INK_SOFT }}>
          {products.length > 0
            ? `${products.length} item${products.length > 1 ? 's' : ''} saved`
            : 'Items you save will show up here'}
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse"
              style={{ background: SKELETON, border: `1px solid ${LINE}`, borderRadius: '20px' }}
            />
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-20">
          <Heart size={30} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: PRIMARY }} />
          <p className="text-sm font-bold mb-5" style={{ color: INK_SOFT }}>Your wishlist is empty</p>
          <Link
            href="/"
            className="inline-block px-7 py-3 text-sm font-bold rounded-full transition-all active:scale-[0.98] active:opacity-80 bg-[#2D1028] text-white border border-[#2D1028] hover:bg-[#C2185B] hover:border-[#C2185B] hover:shadow-[0_10px_24px_rgba(194,24,91,0.25)]"
          >
            Start Shopping
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}