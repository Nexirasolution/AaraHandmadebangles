'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';

// Palette: 60% white/cream · 25% navy · 10% gold · 5% pale gold
// Keep in sync with the other storefront components.
const PAPER = '#FFFFFF';
const CREAM = '#F8F6EF';
const NAVY = '#102A56';
const NAVY_DARK = '#071A3A';
const GOLD = '#C9A227';
const GOLD_PALE = '#E6D39A';

const INK = NAVY_DARK;
const GREY = 'rgba(16, 42, 86, 0.70)'; // secondary text (navy tint)
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ background: PAPER }}>
      <div className="mb-6 pb-4" style={{ borderBottom: `1px solid ${GOLD}` }}>
        <h1
          className="text-2xl tracking-tight mb-1"
          style={{ fontFamily: FONT_SERIF, color: INK, fontWeight: 400 }}
        >
          Search results for &ldquo;{q}&rdquo;
        </h1>
        <p className="text-sm" style={{ color: NAVY }}>
          {loading ? 'Searching…' : `${products.length} ${products.length === 1 ? 'product' : 'products'} found`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse"
              style={{ background: CREAM, border: `1px solid ${GOLD_PALE}`, borderRadius: '4px' }}
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: GREY }}>
          No products matched your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm" style={{ color: GREY }}>
          Loading...
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}