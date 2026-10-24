'use client';

// Palette: 60% white/cream · 25% navy · 10% gold · 5% pale gold
// Same styling as the "Buy now" buttons in ProductCard and ColorPackSelector.
export default function PrintButton({ label = 'Print / Save as PDF' }) {
  return (
    <div className="text-center mt-6 print:hidden">
      <button
        onClick={() => window.print()}
        className="bg-[#071A3A] text-[#E6D39A] border border-[#C9A227] rounded-full px-7 py-2.5 text-sm font-medium tracking-wide transition-colors hover:bg-[#C9A227] hover:text-[#071A3A]"
      >
        {label}
      </button>
    </div>
  );
}