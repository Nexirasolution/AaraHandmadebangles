'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, Loader2, X } from 'lucide-react';
import { MATERIALS, FINISHES, STONE_TYPES, OCCASIONS, BANGLE_SIZES } from '@/lib/jewellery';

// Palette: Primary #C2185B · Secondary #D4A017 · Background #FFF8F3 · Text #2D1028 · Accent #F8D7E3
// Keep in sync with the other admin pages.
const INK = '#2D1028';
const INK_SOFT = 'rgba(45, 16, 40, 0.6)';
const PRIMARY = '#C2185B';
const ACCENT = '#F8D7E3';
const LINE = '#F1DCE4'; // soft pink border, derived from the accent
const PAPER = '#FFFFFF';
const DISABLED_BG = '#FFF8F3';

function emptyVariant() {
  return {
    color: '',
    colorHex: '#C2185B',
    images: [''],
    price: '',
    compareAtPrice: '',
    // Only used when the variant has NO sizes. '' = not tracked (unlimited).
    stock: '',
    sizes: [{ size: '', stock: 0, sku: '' }],
  };
}

// Makes variants loaded from the DB safe to edit: every controlled input
// gets a defined value and every variant has at least one image slot.
function normalizeVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return [emptyVariant()];
  return variants.map((v) => ({
    ...v,
    color: v.color || '',
    colorHex: v.colorHex || '#000000',
    images: Array.isArray(v.images) && v.images.length ? v.images : [''],
    price: v.price ?? '',
    compareAtPrice: v.compareAtPrice > 0 ? v.compareAtPrice : '',
    stock: v.stock ?? '',
    sizes: (v.sizes || []).map((s) => ({ ...s, size: s.size || '', stock: s.stock ?? 0, sku: s.sku || '' })),
  }));
}

function normalizeSizeChart(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value]; // backward-compat with the old single-string field
  return [];
}

// Shared input style
const inputStyle = {
  border: `1px solid ${LINE}`,
  borderRadius: '4px',
  padding: '8px 12px',
  fontSize: '14px',
  fontFamily: 'sans-serif',
  color: INK,
  background: PAPER,
  width: '100%',
  outline: 'none',
  marginTop: '4px',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '500',
  color: INK_SOFT,
  fontFamily: 'sans-serif',
};

const hintStyle = { fontWeight: '400', textTransform: 'none', letterSpacing: 0 };

const cardStyle = {
  background: PAPER,
  border: `1px solid ${LINE}`,
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '16px',
};

const sectionHeadStyle = {
  fontSize: '11px',
  fontWeight: '500',
  color: INK,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontFamily: 'sans-serif',
  marginBottom: '12px',
};

const focusOn = (e) => (e.target.style.borderColor = PRIMARY);
const focusOff = (e) => (e.target.style.borderColor = LINE);

// Dropdown for a jewellery attribute. If the product already has a value
// that isn't in the standard list (e.g. typed by hand earlier), it is kept
// as an extra option so editing never silently drops it.
function AttributeSelect({ label, hint, value, options, onChange, emptyLabel }) {
  const hasCustom = value && !options.includes(value);
  return (
    <div>
      <label style={labelStyle}>
        {label} {hint && <span style={hintStyle}>{hint}</span>}
      </label>
      <select
        style={inputStyle}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={focusOn}
        onBlur={focusOff}
      >
        <option value="">{emptyLabel}</option>
        {hasCustom && <option value={value}>{value}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ImageSlot({ value, onChange, onRemove, showRemove }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className="shrink-0 overflow-hidden relative"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '4px',
          border: `1.5px dashed ${PRIMARY}`,
          background: ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : uploading ? (
          <Loader2 size={16} className="animate-spin" style={{ color: INK }} />
        ) : (
          <Upload size={14} style={{ color: PRIMARY }} />
        )}
        {uploading && value && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <Loader2 size={14} className="animate-spin" style={{ color: INK }} />
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <input
        placeholder="https://... or click thumbnail to upload"
        style={{ ...inputStyle, marginTop: 0, flex: 1 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={focusOn}
        onBlur={focusOff}
      />

      {showRemove && (
        <button type="button" onClick={onRemove} style={{ color: INK_SOFT, flexShrink: 0 }}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// Video upload slot — renders a playable <video> thumbnail, with a remove button.
function VideoSlot({ value, uploading, onRemove }) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: '4px', border: `1px solid ${LINE}` }}>
      <video src={value} className="w-full h-24 object-cover" muted playsInline controls />
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: INK }} />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', color: PAPER }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function ProductForm({ initial, productId }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() => {
    const base = initial || {
      name: '', slug: '', sku: '', description: '', category: '', weight: '', tags: [],
      material: '', finish: '', stoneType: '', piecesInSet: 1, occasion: [], careInstructions: '',
      variants: [emptyVariant()],
      sizeChart: [],
      videos: [],
      seoTitle: '', seoDescription: '',
      isBestSeller: false, isTopSeller: false, isActiveSeller: true, isFeatured: false, isActive: true,
      isReadyToShip: false,
    };
    return {
      ...base,
      // Products saved before weight existed have 0 / undefined —
      // show the field empty so the admin is prompted to fill it in.
      weight: base.weight > 0 ? base.weight : '',
      material: base.material || '',
      finish: base.finish || '',
      stoneType: base.stoneType || '',
      piecesInSet: base.piecesInSet > 0 ? base.piecesInSet : 1,
      occasion: base.occasion || [],
      careInstructions: base.careInstructions || '',
      sizeChart: normalizeSizeChart(base.sizeChart),
      videos: base.videos || [],
      seoTitle: base.seoTitle || '',
      seoDescription: base.seoDescription || '',
      variants: normalizeVariants(base.variants),
    };
  });
  // Tags are edited as raw text and parsed on save. Parsing on every
  // keystroke made it impossible to type a comma (it was stripped instantly).
  const [tagsText, setTagsText] = useState(() =>
    Array.isArray(initial?.tags) ? initial.tags.join(', ') : ''
  );
  const [saving, setSaving] = useState(false);
  const [sizeChartUploading, setSizeChartUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const sizeChartFileRef = useRef();
  const videoFileRef = useRef();

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function toggleArrayValue(field, value) {
    setForm((f) => {
      const current = f[field] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [field]: next };
    });
  }

  function updateVariant(idx, field, value) {
    setForm((f) => { const v = [...f.variants]; v[idx] = { ...v[idx], [field]: value }; return { ...f, variants: v }; });
  }

  function updateVariantImage(vIdx, imgIdx, value) {
    setForm((f) => {
      const variants = [...f.variants];
      const images = [...variants[vIdx].images];
      images[imgIdx] = value;
      variants[vIdx] = { ...variants[vIdx], images };
      return { ...f, variants };
    });
  }

  function removeVariantImage(vIdx, imgIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      const images = variants[vIdx].images.filter((_, i) => i !== imgIdx);
      variants[vIdx] = { ...variants[vIdx], images: images.length ? images : [''] };
      return { ...f, variants };
    });
  }

  function addVariantImage(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], images: [...variants[vIdx].images, ''] };
      return { ...f, variants };
    });
  }

  function updateSize(vIdx, sIdx, field, value) {
    setForm((f) => {
      const variants = [...f.variants];
      const sizes = [...variants[vIdx].sizes];
      sizes[sIdx] = { ...sizes[sIdx], [field]: value };
      variants[vIdx] = { ...variants[vIdx], sizes };
      return { ...f, variants };
    });
  }

  function addSize(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], sizes: [...variants[vIdx].sizes, { size: '', stock: 0, sku: '' }] };
      return { ...f, variants };
    });
  }

  // Adds 2.2 / 2.4 / 2.6 / 2.8 / 2.10 to a variant, skipping sizes it
  // already has and replacing a single blank placeholder row.
  function addStandardBangleSizes(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      const current = variants[vIdx].sizes.filter((s) => s.size.trim() !== '' || Number(s.stock) > 0 || s.sku);
      const existing = new Set(current.map((s) => s.size));
      const toAdd = BANGLE_SIZES
        .filter((size) => !existing.has(size))
        .map((size) => ({ size, stock: 0, sku: '' }));
      variants[vIdx] = { ...variants[vIdx], sizes: [...current, ...toAdd] };
      return { ...f, variants };
    });
  }

  function removeSize(vIdx, sIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], sizes: variants[vIdx].sizes.filter((_, i) => i !== sIdx) };
      return { ...f, variants };
    });
  }

  function addVariant() { setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] })); }
  function removeVariant(idx) { setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) })); }

  // Size guide — supports multiple images. Selecting several files at once
  // uploads each in turn and appends every resulting URL to the array.
  async function handleSizeChartFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSizeChartUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push(data.url);
      }
      setForm((f) => ({ ...f, sizeChart: [...(f.sizeChart || []), ...uploaded] }));
      toast.success(`${uploaded.length} size guide image${uploaded.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSizeChartUploading(false);
      e.target.value = '';
    }
  }

  function removeSizeChartImage(idx) {
    setForm((f) => ({ ...f, sizeChart: (f.sizeChart || []).filter((_, i) => i !== idx) }));
  }

  // Videos — supports multiple files, uploaded one at a time through the
  // same /api/upload endpoint used for images. Cloudinary's
  // resource_type: 'auto' detects the file as video and returns a
  // playable secure_url.
  async function handleVideoFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setVideoUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push(data.url);
      }
      setForm((f) => ({ ...f, videos: [...(f.videos || []), ...uploaded] }));
      toast.success(`${uploaded.length} video${uploaded.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVideoUploading(false);
      e.target.value = '';
    }
  }

  function removeVideo(idx) {
    setForm((f) => ({ ...f, videos: (f.videos || []).filter((_, i) => i !== idx) }));
  }

  async function submit(e) {
    e.preventDefault();

    if (!form.weight || Number(form.weight) <= 0) {
      toast.error('Enter the weight in grams (used for shipping)');
      return;
    }

    // Variant-level validation (the schema only enforces that price exists).
    for (let i = 0; i < form.variants.length; i++) {
      const v = form.variants[i];
      const n = i + 1;
      const price = Number(v.price);
      if (!(price > 0)) {
        toast.error(`Variant ${n}: enter a valid price`);
        return;
      }
      const compare = Number(v.compareAtPrice);
      if (compare > 0 && compare < price) {
        toast.error(`Variant ${n}: compare-at price should be higher than the price`);
        return;
      }
      const names = v.sizes.map((s) => s.size.trim().toLowerCase()).filter(Boolean);
      if (new Set(names).size !== names.length) {
        toast.error(`Variant ${n}: duplicate size names`);
        return;
      }
    }

    setSaving(true);
    // Note: sku is intentionally omitted — it's auto-generated/managed server-side
    // based on the product's category (see /api/products and /api/products/[id]).
    const payload = {
      ...form,
      category: form.category?._id || form.category,
      weight: Number(form.weight) || 0,
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      material: (form.material || '').trim(),
      finish: (form.finish || '').trim(),
      stoneType: (form.stoneType || '').trim(),
      piecesInSet: Math.max(1, Math.floor(Number(form.piecesInSet)) || 1),
      occasion: form.occasion || [],
      careInstructions: (form.careInstructions || '').trim(),
      seoTitle: (form.seoTitle || '').trim(),
      seoDescription: (form.seoDescription || '').trim(),
      sizeChart: form.sizeChart || [],
      videos: form.videos || [],
      variants: form.variants.map((v) => {
        const sizes = v.sizes
          .filter((s) => s.size.trim() !== '')
          .map((s) => ({ ...s, size: s.size.trim(), stock: Math.max(0, Number(s.stock) || 0), sku: (s.sku || '').trim() }));
        const out = {
          ...v,
          price: Number(v.price),
          compareAtPrice: Number(v.compareAtPrice) || 0,
          images: v.images.filter(Boolean),
          sizes,
        };
        // Variant-level stock only applies to size-less variants. Blank =
        // not tracked (unlimited); for sized variants it is ignored.
        if (sizes.length === 0 && String(v.stock ?? '').trim() !== '') {
          out.stock = Math.max(0, Number(v.stock) || 0);
        } else {
          delete out.stock;
        }
        return out;
      }),
    };
    delete payload.sku;
    // Server-managed fields — never send them back. soldCount / rating /
    // reviewCount in particular would overwrite live values with the stale
    // copy loaded when the page opened.
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.basePrice; // recomputed from variants on the server
    delete payload.soldCount;
    delete payload.rating;
    delete payload.reviewCount;
    // Clothing-only fields from older products — never send them back.
    delete payload.fabric;
    delete payload.sleeveOptions;
    delete payload.zipOptions;
    delete payload.pantOptions;
    delete payload.shawlOptions;

    const url = productId ? `/api/products/${productId}` : '/api/products';
    const method = productId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        toast.success(productId ? 'Product updated' : 'Product created');
        router.push('/admin/products');
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* Basic Info Card */}
      <div style={cardStyle}>
        <p style={sectionHeadStyle}>Product Details</p>
        <div style={{ height: '1px', background: LINE, marginBottom: '16px' }} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Product Name *</label>
            <input
              required
              style={inputStyle}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>
          <div>
            <label style={labelStyle}>SKU</label>
            <input
              disabled
              readOnly
              style={{ ...inputStyle, background: DISABLED_BG, color: INK_SOFT, cursor: 'not-allowed' }}
              value={form.sku || 'Auto-generated from category on save'}
              title="SKU is generated automatically from the product's category"
            />
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select
              required
              style={inputStyle}
              value={form.category?._id || form.category}
              onChange={(e) => update('category', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Weight per set / piece (grams) *</label>
            <input
              required
              type="number"
              min="1"
              placeholder="e.g. 120"
              style={inputStyle}
              value={form.weight ?? ''}
              onChange={(e) => update('weight', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          {/* Jewellery attributes */}
          <AttributeSelect
            label="Material"
            value={form.material}
            options={MATERIALS}
            onChange={(v) => update('material', v)}
            emptyLabel="— Not specified —"
          />
          <AttributeSelect
            label="Finish / plating"
            value={form.finish}
            options={FINISHES}
            onChange={(v) => update('finish', v)}
            emptyLabel="— Not specified —"
          />
          <AttributeSelect
            label="Stone / decorative work"
            hint="(optional)"
            value={form.stoneType}
            options={STONE_TYPES}
            onChange={(v) => update('stoneType', v)}
            emptyLabel="— None —"
          />
          <div>
            <label style={labelStyle}>
              Pieces in a set <span style={hintStyle}>(1 = sold singly, 4 = set of 4 bangles)</span>
            </label>
            <input
              type="number"
              min="1"
              style={inputStyle}
              value={form.piecesInSet}
              onChange={(e) => update('piecesInSet', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          <div className="sm:col-span-2">
            <label style={labelStyle}>
              Occasion <span style={hintStyle}>(optional)</span>
            </label>
            <div className="flex flex-wrap gap-3 mt-2">
              {OCCASIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: INK, fontFamily: 'sans-serif' }}>
                  <input
                    type="checkbox"
                    checked={(form.occasion || []).includes(opt)}
                    onChange={() => toggleArrayValue('occasion', opt)}
                    style={{ accentColor: PRIMARY, width: '15px', height: '15px' }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label style={labelStyle}>Tags (comma separated)</label>
            <input
              style={inputStyle}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>
          <div className="sm:col-span-2">
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>
          <div className="sm:col-span-2">
            <label style={labelStyle}>
              Care instructions <span style={hintStyle}>(optional — shown on the product page)</span>
            </label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={2}
              placeholder="e.g. Keep away from water and perfume. Store in the box provided."
              value={form.careInstructions}
              onChange={(e) => update('careInstructions', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          {/* SEO */}
          <div>
            <label style={labelStyle}>
              SEO title <span style={hintStyle}>(optional)</span>
            </label>
            <input
              style={inputStyle}
              value={form.seoTitle}
              onChange={(e) => update('seoTitle', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>
          <div>
            <label style={labelStyle}>
              SEO description <span style={hintStyle}>(optional)</span>
            </label>
            <input
              style={inputStyle}
              value={form.seoDescription}
              onChange={(e) => update('seoDescription', e.target.value)}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          {/* Size guide — one or more images. If left empty, the storefront
              falls back to this product's category size guide. */}
          <div className="sm:col-span-2">
            <label style={labelStyle}>
              Size Guide <span style={hintStyle}>
                (optional — e.g. how to measure your bangle size; shown as a gallery on the product page and falls back to the category's size guide if left empty)
              </span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-2">
              {(form.sizeChart || []).map((url, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden" style={{ borderRadius: '4px', border: `1px solid ${LINE}` }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeSizeChartImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', color: PAPER }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={sizeChartUploading}
                onClick={() => sizeChartFileRef.current?.click()}
                className="aspect-square flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                style={{ borderRadius: '4px', border: `1.5px dashed ${PRIMARY}`, background: ACCENT, color: PRIMARY, cursor: 'pointer' }}
              >
                {sizeChartUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <span style={{ fontSize: '10px', fontFamily: 'sans-serif' }}>{sizeChartUploading ? 'Uploading…' : 'Add'}</span>
              </button>
            </div>
            <input ref={sizeChartFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSizeChartFilesChange} />
          </div>

          {/* Product videos — optional, shown on the storefront PDP below
              the image gallery. Accepts any video file; upload goes through
              the same /api/upload endpoint as images. */}
          <div className="sm:col-span-2">
            <label style={labelStyle}>
              Product Videos <span style={hintStyle}>
                (optional — e.g. a wrist-show or sparkle clip, shown below the image gallery)
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {(form.videos || []).map((url, idx) => (
                <VideoSlot key={idx} value={url} uploading={false} onRemove={() => removeVideo(idx)} />
              ))}
              <button
                type="button"
                disabled={videoUploading}
                onClick={() => videoFileRef.current?.click()}
                className="h-24 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                style={{ borderRadius: '4px', border: `1.5px dashed ${PRIMARY}`, background: ACCENT, color: PRIMARY, cursor: 'pointer' }}
              >
                {videoUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <span style={{ fontSize: '10px', fontFamily: 'sans-serif' }}>{videoUploading ? 'Uploading…' : 'Add video'}</span>
              </button>
            </div>
            <input ref={videoFileRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoFilesChange} />
          </div>

          {/* Toggles */}
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            {[
              ['isBestSeller', 'Bestseller'],
              ['isTopSeller', 'Top Seller'],
              ['isActiveSeller', 'Active Seller'],
              ['isFeatured', 'Featured'],
              ['isActive', 'Active (visible on site)'],
              ['isReadyToShip', 'Ready to Ship'],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: INK_SOFT, fontFamily: 'sans-serif' }}
              >
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => update(key, e.target.checked)}
                  style={{ accentColor: PRIMARY, width: '15px', height: '15px' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Variants Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ ...sectionHeadStyle, marginBottom: 0 }}>Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 text-sm font-medium px-4 py-2 transition-colors"
            style={{
              background: PAPER,
              color: PRIMARY,
              border: `1px solid ${PRIMARY}`,
              borderRadius: '4px',
              fontFamily: 'sans-serif',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = PRIMARY;
              e.currentTarget.style.color = PAPER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = PAPER;
              e.currentTarget.style.color = PRIMARY;
            }}
          >
            <Plus size={16} /> Add Variant
          </button>
        </div>

        {form.variants.map((v, vIdx) => {
          const hasNamedSizes = v.sizes.some((s) => s.size.trim() !== '');
          return (
            <div key={v._id || vIdx} style={cardStyle}>
              {/* Variant header */}
              <div
                className="flex justify-between items-center mb-3 pb-2"
                style={{ borderBottom: `1px solid ${LINE}` }}
              >
                <span style={{ fontWeight: '500', fontSize: '13px', color: INK, fontFamily: 'sans-serif' }}>
                  Variant {vIdx + 1}
                </span>
                {form.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(vIdx)}
                    style={{ color: INK_SOFT, cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-4 gap-3 mb-3">
                <input
                  placeholder="Color name (e.g. Maroon)"
                  style={inputStyle}
                  value={v.color}
                  onChange={(e) => updateVariant(vIdx, 'color', e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <input
                  type="color"
                  style={{ ...inputStyle, padding: '4px', height: '40px' }}
                  value={v.colorHex}
                  onChange={(e) => updateVariant(vIdx, 'colorHex', e.target.value)}
                />
                <input
                  placeholder="Price ₹"
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={v.price}
                  onChange={(e) => updateVariant(vIdx, 'price', e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <input
                  placeholder="Compare-at price ₹"
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={v.compareAtPrice}
                  onChange={(e) => updateVariant(vIdx, 'compareAtPrice', e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              <p style={{ fontSize: '12px', color: INK_SOFT, fontFamily: 'sans-serif', marginBottom: '8px', fontWeight: '500' }}>
                Images for this colour — click thumbnail to upload
              </p>
              {v.images.map((img, imgIdx) => (
                <ImageSlot
                  key={imgIdx}
                  value={img}
                  onChange={(url) => updateVariantImage(vIdx, imgIdx, url)}
                  onRemove={() => removeVariantImage(vIdx, imgIdx)}
                  showRemove={v.images.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={() => addVariantImage(vIdx)}
                style={{ fontSize: '12px', color: PRIMARY, fontFamily: 'sans-serif', fontWeight: '500', marginBottom: '12px', cursor: 'pointer' }}
              >
                + Add another image
              </button>

              <p style={{ fontSize: '12px', color: INK_SOFT, fontFamily: 'sans-serif', fontWeight: '500', marginBottom: '6px' }}>
                Sizes &amp; Stock{' '}
                <span style={hintStyle}>(leave sizes blank for pieces that have no size)</span>
              </p>
              {v.sizes.map((s, sIdx) => (
                <div key={s._id || sIdx} className="flex gap-2 mb-2 items-center">
                  <input
                    placeholder="Size (e.g. 2.4, Free Size)"
                    style={{ ...inputStyle, width: '160px', marginTop: 0 }}
                    value={s.size}
                    onChange={(e) => updateSize(vIdx, sIdx, 'size', e.target.value)}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Stock"
                    style={{ ...inputStyle, width: '90px', marginTop: 0 }}
                    value={s.stock}
                    onChange={(e) => updateSize(vIdx, sIdx, 'stock', e.target.value)}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                  <input
                    placeholder="SKU (optional)"
                    style={{ ...inputStyle, flex: 1, marginTop: 0 }}
                    value={s.sku || ''}
                    onChange={(e) => updateSize(vIdx, sIdx, 'sku', e.target.value)}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                  <button
                    type="button"
                    onClick={() => removeSize(vIdx, sIdx)}
                    style={{ color: INK_SOFT, cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-4 mb-3">
                <button
                  type="button"
                  onClick={() => addSize(vIdx)}
                  style={{ fontSize: '12px', color: PRIMARY, fontFamily: 'sans-serif', fontWeight: '500', cursor: 'pointer' }}
                >
                  + Add size
                </button>
                <button
                  type="button"
                  onClick={() => addStandardBangleSizes(vIdx)}
                  style={{ fontSize: '12px', color: PRIMARY, fontFamily: 'sans-serif', fontWeight: '500', cursor: 'pointer' }}
                >
                  + Add all bangle sizes ({BANGLE_SIZES.join(', ')})
                </button>
              </div>

              {/* Stock for variants with no sizes (schema: variant.stock) */}
              <div style={{ maxWidth: '260px' }}>
                <label style={labelStyle}>
                  Stock (no-size pieces){' '}
                  <span style={hintStyle}>
                    {hasNamedSizes ? '— not used, stock is set per size above' : '— leave blank for unlimited'}
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Blank = not tracked"
                  disabled={hasNamedSizes}
                  style={{
                    ...inputStyle,
                    ...(hasNamedSizes ? { background: DISABLED_BG, color: INK_SOFT, cursor: 'not-allowed' } : {}),
                  }}
                  value={hasNamedSizes ? '' : v.stock}
                  onChange={(e) => updateVariant(vIdx, 'stock', e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <button
        disabled={saving}
        className="w-full sm:w-auto px-8 py-3 font-medium text-sm transition-opacity"
        style={{
          background: PRIMARY,
          color: PAPER,
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          letterSpacing: '0.02em',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
      </button>
    </form>
  );
}