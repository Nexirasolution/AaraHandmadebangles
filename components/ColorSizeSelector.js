'use client';

// Design tokens — keep in sync with the homepage, CartPage, CheckoutPage and ProductPage.
//   Primary    #C2185B  selected option, active ring
//   Secondary  #D4A017  thin decorative accents only
//   Background #FFFFFF  pure white
//   Text       #2D1028  headings + body
//   Accent     #F8D7E3  soft hover wash
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const PAPER = '#FFFFFF';

const INK_SOFT = 'rgba(45, 16, 40, 0.72)';
const LINE = 'rgba(45, 16, 40, 0.15)';
const DISABLED = 'rgba(45, 16, 40, 0.35)';
const DISABLED_LINE = 'rgba(45, 16, 40, 0.08)';

// Shared chip styles — fully round pills, pink when selected.
function chipStyle({ active, disabled }) {
  return {
    border: `1px solid ${disabled ? DISABLED_LINE : active ? PRIMARY : LINE}`,
    background: active ? PRIMARY : PAPER,
    color: disabled ? DISABLED : active ? PAPER : INK,
    textDecoration: disabled ? 'line-through' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const CHIP_BASE =
  'rounded-full text-sm font-bold transition-colors active:opacity-80';
const CHIP_HOVER = 'hover:bg-[#F8D7E3] hover:border-[#C2185B]/40';

function AddonSelector({ label, options, activeId, onChange, formatINR }) {
  if (!options?.length) return null;
  const active = options.find((o) => o._id === activeId);

  return (
    <div>
      <p className="text-sm font-medium mb-2.5" style={{ color: INK_SOFT }}>{label}</p>
      <div className="flex gap-2.5 flex-wrap">
        {/* Explicit "None" choice — covers "without pant" / "without shawl" */}
        <button
          type="button"
          onClick={() => onChange('')}
          className={`h-9 px-4 ${CHIP_BASE} ${!activeId ? '' : CHIP_HOVER}`}
          style={chipStyle({ active: !activeId })}
        >
          None
        </button>

        {options.map((opt) => {
          const outOfStock = (opt.stock ?? 0) <= 0;
          const isActive = activeId === opt._id;
          return (
            <button
              key={opt._id}
              type="button"
              disabled={outOfStock}
              onClick={() => onChange(opt._id)}
              className={`flex items-center gap-2 h-9 pl-1.5 pr-4 ${CHIP_BASE} ${isActive || outOfStock ? '' : CHIP_HOVER}`}
              style={chipStyle({ active: isActive, disabled: outOfStock })}
            >
              {opt.image && (
                <span
                  className="w-6 h-6 rounded-full overflow-hidden shrink-0"
                  style={{ background: PAPER }}
                >
                  <img src={opt.image} alt="" className="w-full h-full object-cover" />
                </span>
              )}
              {opt.name}
              {opt.price > 0 && (
                <span style={{ opacity: 0.8 }}>+{formatINR(opt.price)}</span>
              )}
            </button>
          );
        })}
      </div>

      {active?.image && (
        <div
          className="mt-2.5 w-16 h-16 overflow-hidden"
          style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: '12px' }}
        >
          <img src={active.image} alt={active.name} className="w-full h-full object-cover" />
        </div>
      )}
      {active && active.stock > 0 && active.stock <= 5 && (
        <p className="mt-2 text-xs font-bold" style={{ color: PRIMARY }}>
          Only {active.stock} left in stock
        </p>
      )}
    </div>
  );
}

export default function ColorSizeSelector({
  variants,
  activeVariant,
  onColorChange,
  activeSize,
  onSizeChange,
  categoryType,
  sizeChartImages,
  onViewSizeChart,
  sleeveOptions,
  activeSleeve,
  onSleeveChange,
  zipOptions,
  activeZip,
  onZipChange,
  pantOptions,
  activePantId,
  onPantChange,
  shawlOptions,
  activeShawlId,
  onShawlChange,
  formatINR,
}) {
  const isJewellery = categoryType === 'jewellery';
  const sizeStock = (size) => activeVariant?.sizes?.find((s) => s.size === size)?.stock ?? 0;

  const hasColors = variants?.some((v) => v.color && v.color.trim());
  // Products without sizes: the whole size block (title, chips, size chart) is hidden.
  const hasSizes = Array.isArray(activeVariant?.sizes) && activeVariant.sizes.length > 0;
  const hasSizeChart = Array.isArray(sizeChartImages) && sizeChartImages.length > 0;
  const hasSleeveOptions = Array.isArray(sleeveOptions) && sleeveOptions.length > 0;
  const hasZipOptions = Array.isArray(zipOptions) && zipOptions.length > 0;

  return (
    <div className="space-y-6">

      {/* Color selector */}
      {hasColors && (
        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: INK_SOFT }}>
            {isJewellery ? 'Material/Colour' : 'Color'}
            {' '}
            <span className="font-bold" style={{ color: INK }}>{activeVariant?.color}</span>
          </p>

          <div className="flex gap-2.5 flex-wrap">
            {variants.map((v) => {
              const isActive = activeVariant?._id === v._id;
              return (
                <button
                  key={v._id}
                  type="button"
                  onClick={() => onColorChange(v)}
                  title={v.color}
                  aria-label={v.color}
                  className="relative w-8 h-8 rounded-full transition-transform"
                  style={{
                    backgroundColor: v.colorHex || '#ccc',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    // Thin outline keeps white swatches visible; active gets a pink ring
                    boxShadow: isActive
                      ? `0 0 0 2px ${PAPER}, 0 0 0 3.5px ${PRIMARY}`
                      : `0 0 0 1px ${LINE}`,
                  }}
                >
                  {isActive && (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-bold"
                      style={{ textShadow: '0 1px 2px rgba(45,16,40,0.5)' }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Jewellery attributes — plain labels separated by a dot, no chips */}
      {isJewellery && (activeVariant?.material || activeVariant?.purity || activeVariant?.weight > 0) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium" style={{ color: INK_SOFT }}>
          {[activeVariant?.material, activeVariant?.purity, activeVariant?.weight > 0 ? `${activeVariant.weight}g` : null]
            .filter(Boolean)
            .map((label, i, arr) => (
              <span key={label} className="flex items-center gap-2">
                <span style={{ color: INK }}>{label}</span>
                {i < arr.length - 1 && <span style={{ color: GOLD }}>·</span>}
              </span>
            ))}
        </div>
      )}

      {/* Size selector — only when this variant actually has sizes */}
      {hasSizes && (
        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: INK_SOFT }}>
            {isJewellery ? 'Ring/Bangle Size' : 'Size'}
          </p>

          <div className="flex gap-2 flex-wrap">
            {activeVariant.sizes.map((s) => {
              const outOfStock = s.stock <= 0;
              const active = activeSize === s.size;
              return (
                <button
                  key={s.size}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onSizeChange(s.size)}
                  className={`min-w-[44px] h-[38px] px-3.5 ${CHIP_BASE} ${active || outOfStock ? '' : CHIP_HOVER}`}
                  style={chipStyle({ active, disabled: outOfStock })}
                >
                  {s.size}
                </button>
              );
            })}
          </div>

          {activeSize && sizeStock(activeSize) <= 5 && sizeStock(activeSize) > 0 && (
            <p className="mt-2.5 text-xs font-bold" style={{ color: PRIMARY }}>
              Only {sizeStock(activeSize)} left in stock
            </p>
          )}

          {/* Size chart — shown directly below the size selector. Resolved by
              the parent as product.sizeChart, falling back to category.sizeChart.
              Opens a swipeable carousel when there's more than one image. */}
          {hasSizeChart && (
            <button
              type="button"
              onClick={onViewSizeChart}
              className="mt-2.5 text-xs font-bold underline underline-offset-2 transition-colors hover:text-[#C2185B]"
              style={{ color: INK_SOFT, textDecorationColor: PRIMARY }}
            >
              View size chart{sizeChartImages.length > 1 ? ` (${sizeChartImages.length})` : ''}
            </button>
          )}
        </div>
      )}

      {/* Sleeve type selector — product-level, shown only if the admin
          picked one or more allowed options for this product. */}
      {hasSleeveOptions && (
        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: INK_SOFT }}>Sleeve Type</p>
          <div className="flex gap-2 flex-wrap">
            {sleeveOptions.map((opt) => {
              const active = activeSleeve === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSleeveChange(opt)}
                  className={`h-[38px] px-4 ${CHIP_BASE} ${active ? '' : CHIP_HOVER}`}
                  style={chipStyle({ active })}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Zip type selector — same pattern as sleeve type */}
      {hasZipOptions && (
        <div>
          <p className="text-sm font-medium mb-2.5" style={{ color: INK_SOFT }}>Zip Type</p>
          <div className="flex gap-2 flex-wrap">
            {zipOptions.map((opt) => {
              const active = activeZip === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onZipChange(opt)}
                  className={`h-[38px] px-4 ${CHIP_BASE} ${active ? '' : CHIP_HOVER}`}
                  style={chipStyle({ active })}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pant selector — optional product-level add-on. "None" covers
          "without pant". Price shown is added on top of the base price. */}
      <AddonSelector
        label="Pant"
        options={pantOptions}
        activeId={activePantId}
        onChange={onPantChange}
        formatINR={formatINR}
      />

      {/* Shawl selector — same pattern as Pant */}
      <AddonSelector
        label="Shawl"
        options={shawlOptions}
        activeId={activeShawlId}
        onChange={onShawlChange}
        formatINR={formatINR}
      />
    </div>
  );
}