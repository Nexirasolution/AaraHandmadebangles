import Link from 'next/link';

// Palette: 60% white/cream · 25% navy · 10% gold · 5% pale gold
// Keep in sync with Navbar, Footer, ProductCard and Filters.
const NAVY_DARK = '#071A3A';
const GOLD = '#C9A227';
const GOLD_PALE = '#E6D39A';

const INK = NAVY_DARK;
const LINE = 'rgba(230, 211, 154, 0.9)'; // pale-gold hairlines
const INK_FAINT = 'rgba(16, 42, 86, 0.35)'; // ellipsis

function getPageNumbers(current, total) {
  const delta = 1;
  const range = [];
  const pages = [];

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  let prev;
  for (const i of range) {
    if (prev !== undefined && i - prev > 1) pages.push('...');
    pages.push(i);
    prev = i;
  }
  return pages;
}

export default function Pagination({ currentPage, totalPages, basePath }) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const linkStyle = (isActive) => ({
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 500,
    minWidth: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    color: isActive ? GOLD_PALE : INK,
    background: isActive ? NAVY_DARK : 'transparent',
    border: isActive ? `1px solid ${GOLD}` : `1px solid ${LINE}`,
  });

  return (
    <nav aria-label="Product pagination" className="mt-12 flex items-center justify-center gap-2 flex-wrap">
      {/* Prev */}
      {currentPage > 1 ? (
        <Link href={`${basePath}?page=${currentPage - 1}`} style={linkStyle(false)} aria-label="Previous page">
          ‹
        </Link>
      ) : (
        <span style={{ ...linkStyle(false), opacity: 0.35, cursor: 'not-allowed' }} aria-hidden="true">
          ‹
        </span>
      )}

      {/* Page numbers */}
      {pageNumbers.map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="text-sm px-1" style={{ color: INK_FAINT }}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={`${basePath}?page=${p}`}
            style={linkStyle(p === currentPage)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link href={`${basePath}?page=${currentPage + 1}`} style={linkStyle(false)} aria-label="Next page">
          ›
        </Link>
      ) : (
        <span style={{ ...linkStyle(false), opacity: 0.35, cursor: 'not-allowed' }} aria-hidden="true">
          ›
        </span>
      )}
    </nav>
  );
}