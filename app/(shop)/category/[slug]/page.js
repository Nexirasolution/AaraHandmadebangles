'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import Filters from '@/components/Filters';

// Design tokens — keep in sync with the homepage, ProductCard, CartPage and Footer.
//   Primary    #C2185B  header band, icons, hover
//   Secondary  #D4A017  thin dividers (decorative only)
//   Background #FFFFFF  pure white page
//   Text       #2D1028  headings + body, dark buttons
//   Accent     #F8D7E3  breadcrumb / description on the pink band, loading tint
const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

function flagToSortValue(flag) {
  if (flag === 'bestseller') return 'bestselling';
  if (flag === 'newarrival') return 'newarrival';
  return 'newest';
}

function sortToApiSort(sort) {
  if (sort === 'newarrival') return 'newest';
  if (sort === 'bestselling') return 'popular';
  return sort;
}

export default function CategoryPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const urlFlag = searchParams.get('flag');

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState(flagToSortValue(urlFlag));
  const [flag, setFlag] = useState(urlFlag);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSort(flagToSortValue(urlFlag));
    setFlag(urlFlag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, urlFlag]);

  function handleSortChange(value) {
    setSort(value);
    if (value === 'newarrival') setFlag('newarrival');
    else if (value === 'bestselling') setFlag('bestseller');
    else setFlag(null);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const catRes = await fetch(`/api/categories/${slug}`);
    const catData = await catRes.json();
    setCategory(catData.category);
    setSubcategories(catData.subcategories || []);

    const params = new URLSearchParams({
      category: slug,
      sort: sortToApiSort(sort),
      limit: '1000',
    });
    if (flag) params.set('flag', flag);

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    setProducts(data.products || []);

    setLoading(false);
  }, [slug, sort, flag]);

  useEffect(() => {
    load();
  }, [load]);

  const heading =
    flag === 'bestseller' ? `Best Sellers${category?.name ? ` in ${category.name}` : ''}` :
    flag === 'topseller' ? `Top Sellers${category?.name ? ` in ${category.name}` : ''}` :
    flag === 'newarrival' ? `New Arrivals${category?.name ? ` in ${category.name}` : ''}` :
    category?.name || 'Products';

  return (
    <div className="bg-white text-[#2D1028]">

      {/* ── Header band: pink, rounded bottom corners ───────────── */}
      <header className="bg-[#C2185B] rounded-b-[28px] sm:rounded-b-[36px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-8 sm:pb-10">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-xs font-bold text-white/80">
            <Link href="/" className="hover:text-[#F8D7E3] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              Home
            </Link>
            {category?.parent && (
              <>
                <ChevronRight size={12} aria-hidden="true" />
                <Link
                  href={`/category/${category.parent.slug}`}
                  className="hover:text-[#F8D7E3] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {category.parent.name}
                </Link>
              </>
            )}
            <ChevronRight size={12} aria-hidden="true" />
            <span className="text-white">{category?.name || 'Products'}</span>
          </nav>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="max-w-2xl">
              <h1
                className="text-[28px] sm:text-4xl font-bold leading-tight text-white"
                style={{ fontFamily: FONT_SERIF }}
              >
                {heading}
              </h1>
              {category?.description && (
                <p className="text-sm font-medium mt-2 text-[#F8D7E3] leading-relaxed">{category.description}</p>
              )}
            </div>

            {!loading && (
              <p className="text-xs font-bold text-[#C2185B] bg-white rounded-full px-3.5 py-1.5 shrink-0 w-fit">
                {products.length} {products.length === 1 ? 'style' : 'styles'}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Subcategories: arched tiles ───────────────────────── */}
        {subcategories.length > 0 && (
          <section aria-label="Subcategories" className="pt-8">
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 -mx-1 px-1">
              {subcategories.map((sub) => (
                <Link
                  key={sub._id}
                  href={`/category/${sub.slug}`}
                  className="group flex-shrink-0 w-24 sm:w-28 flex flex-col items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2185B]"
                >
                  <div className="w-full aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[20px] bg-white border border-[#2D1028]/15 shadow-[0_8px_18px_rgba(45,16,40,0.06)] motion-safe:transition-all motion-safe:duration-300 group-hover:border-[#C2185B] group-hover:shadow-[0_14px_24px_rgba(194,24,91,0.18)] group-hover:-translate-y-1">
                    {sub.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sub.image}
                        alt={sub.name}
                        className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <span className="text-xs font-bold text-center leading-tight text-[#2D1028] underline-offset-4 decoration-[#C2185B] group-hover:text-[#C2185B] group-hover:underline">
                    {sub.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Toolbar: sort/filter ──────────────────────────────── */}
        <div className="mt-6 py-3 border-y border-[#D4A017]/50">
          <Filters sort={sort} onSortChange={handleSortChange} />
        </div>

        {/* ── Product grid ──────────────────────────────────────── */}
        <div className="py-8 sm:py-10">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[3/4] rounded-[20px] bg-[#F8D7E3]/45 border border-[#2D1028]/10 animate-pulse" />
                  <div className="mt-3 h-3 w-3/4 rounded-full bg-[#F8D7E3]/45 animate-pulse" />
                  <div className="mt-2 h-3 w-1/3 rounded-full bg-[#F8D7E3]/45 animate-pulse" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 sm:py-24 max-w-sm mx-auto">
              <ShoppingBag size={32} strokeWidth={1.5} className="mx-auto mb-4 text-[#C2185B]" />
              <p className="text-lg font-bold" style={{ fontFamily: FONT_SERIF }}>
                No products in this category yet
              </p>
              <p className="text-sm font-medium mt-1.5 text-[#2D1028]/70">
                New styles arrive every week. Browse the rest of the collection in the meantime.
              </p>
              <Link
                href="/"
                className="inline-block mt-6 px-7 py-3 text-sm font-bold bg-[#2D1028] text-white border border-[#2D1028] rounded-full transition-all hover:bg-[#C2185B] hover:border-[#C2185B] hover:shadow-[0_10px_24px_rgba(194,24,91,0.25)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2185B]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}