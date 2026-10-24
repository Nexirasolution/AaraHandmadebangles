import ProductCard from '@/components/ProductCard';
import Filters from '@/components/Filters';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import '@/models/Category'; // registers the Category schema — required for .populate('category')

export const dynamic = 'force-dynamic'; // never cache/statically render this page

// Design tokens — keep in sync with the homepage, CategoryPage, ProductCard and Footer.
//   Primary    #C2185B  item-count pill, hover
//   Secondary  #D4A017  thin divider (decorative only)
//   Background #FFFFFF  pure white page
//   Text       #2D1028  headings + body
//   Accent     #F8D7E3  count pill wash
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const PAPER = '#FFFFFF';

const GREY = 'rgba(45, 16, 40, 0.72)'; // secondary text
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

const SORT_MAP = {
  newest: { createdAt: -1 },
  priceLow: { basePrice: 1 },
  priceHigh: { basePrice: -1 },
  popular: { soldCount: -1 },
  rating: { rating: -1 },
};

async function getAllProducts(sort) {
  await dbConnect();

  const query = { isActive: true };
  const sortStage = SORT_MAP[sort] || SORT_MAP.newest;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug type')
      .sort(sortStage)
      .lean(), // no skip/limit — fetch everything
    Product.countDocuments(query),
  ]);

  return {
    products: JSON.parse(JSON.stringify(products)), // strip Mongoose/ObjectId wrappers for the client
    total,
  };
}

export const metadata = {
  title: 'All Products | Aara Handmade Bangles',
};

export default async function ProductsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams; // Next.js 15: searchParams is a Promise

  const sort = resolvedSearchParams?.sort || 'newest';

  const { products, total } = await getAllProducts(sort);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-5 py-12 sm:py-16" style={{ background: PAPER }}>
      <div
        className="mb-8 pb-5 flex items-center justify-between flex-wrap gap-3"
        style={{ borderBottom: `1px solid rgba(212, 160, 23, 0.55)` }}
      >
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ fontFamily: FONT_SERIF, color: INK }}
        >
          All Products
        </h1>
        <span
          className="text-xs font-bold tracking-wide px-3.5 py-1.5 rounded-full"
          style={{ color: INK, background: ACCENT }}
        >
          {total} {total === 1 ? 'item' : 'items'}
        </span>
      </div>

      <Filters sort={sort} />

      {products.length === 0 ? (
        <p className="text-sm font-bold text-center py-16" style={{ color: GREY }}>
          Nothing here yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}