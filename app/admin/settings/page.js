'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { INDIAN_STATES } from '@/lib/indianStates';

// Mobile-first: inputs use text-base on phones (prevents iOS zoom-on-focus)
// and drop to text-sm from the `sm` breakpoint up.
const inputCls = 'w-full min-w-0 border rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm mt-1';
const smallInputCls = 'w-full min-w-0 border rounded-lg px-3 py-2.5 sm:px-2 sm:py-2 text-base sm:text-sm';

export default function AdminSettingsPage() {
  const [form, setForm] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setForm({ ...d.settings, stateShipping: d.settings?.stateShipping || [] }));
  }, []);

  async function submit(e) {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) toast.success('Settings saved');
    else toast.error('Could not save settings');
  }

  // ── State-wise shipping rules ─────────────────────────────────────
  const usedStates = new Set((form?.stateShipping || []).map((r) => r.state));

  function addStateRule() {
    const next = INDIAN_STATES.find((s) => !usedStates.has(s));
    if (!next) return toast.error('All states already added');
    setForm((f) => ({
      ...f,
      stateShipping: [...(f.stateShipping || []), { state: next, pricePerKg: '', freeShippingAbove: '' }]
    }));
  }

  function updateStateRule(idx, key, value) {
    setForm((f) => {
      const list = [...f.stateShipping];
      list[idx] = { ...list[idx], [key]: value };
      return { ...f, stateShipping: list };
    });
  }

  function removeStateRule(idx) {
    setForm((f) => ({ ...f, stateShipping: f.stateShipping.filter((_, i) => i !== idx) }));
  }

  if (!form) return <p className="text-brand-ink/50">Loading...</p>;

  return (
    <div className="w-full max-w-xl">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-brand-magenta mb-4 sm:mb-5">Store Settings</h1>
      <form onSubmit={submit} className="card-soft p-4 sm:p-5 space-y-4 sm:space-y-3">
        <div>
          <label className="text-sm font-medium">Store Name</label>
          <input className={inputCls} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">WhatsApp Number (with country code)</label>
          <input className={inputCls} inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Instagram Handle</label>
          <input className={inputCls} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Address</label>
          <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>

        {/* Weight-based shipping. Each product has its own weight (set on the
            product form). Total order weight = sum of (product weight × qty),
            rounded up to the next whole kg, then charged at price/kg.
            "Default Weight per Piece" is used only for products with no weight. */}
        <p className="text-sm font-semibold pt-2">Shipping (default rates)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
          <div>
            <label className="text-sm font-medium">Default Weight per Piece (grams)</label>
            <input
              type="number"
              inputMode="numeric"
              className={inputCls}
              value={form.weightPerPiece}
              onChange={(e) => setForm({ ...form, weightPerPiece: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Price per Kg (₹)</label>
            <input
              type="number"
              inputMode="numeric"
              className={inputCls}
              value={form.pricePerKg}
              onChange={(e) => setForm({ ...form, pricePerKg: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="text-xs text-brand-ink/50 -mt-1">
          Weight per piece is used only for products that have no weight set. Each product's own weight
          takes priority. Total weight is rounded up to the next whole kg × Price per Kg. These default
          rates apply to every state that has no state-wise rule below.
        </p>
        <p className="text-xs text-brand-ink/50 -mt-1">
          e.g. 3 pieces of 250g + 1 piece of 600g = 1350g → rounds up to 2kg → 2 × ₹60 = ₹120 shipping.
        </p>

        <div>
          <label className="text-sm font-medium">Default Shipping Charge (₹)</label>
          <input
            type="number"
            inputMode="numeric"
            className={inputCls}
            value={form.defaultShippingCharge}
            onChange={(e) => setForm({ ...form, defaultShippingCharge: Number(e.target.value) })}
          />
          <p className="text-xs text-brand-ink/50 mt-1">
            Used instead of the weight calculation if the Price per Kg is 0, or if the cart has no weight
            (no product weight and Default Weight per Piece is 0).
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Free Shipping Above (₹)</label>
          <input
            type="number"
            inputMode="numeric"
            className={inputCls}
            value={form.freeShippingAbove}
            onChange={(e) => setForm({ ...form, freeShippingAbove: Number(e.target.value) })}
          />
        </div>

        {/* State-wise shipping — overrides the default Price per Kg (and
            optionally Free Shipping Above) for customers in that state.
            Phones: each rule is a small card (state on top, two fields below).
            sm and up: a single compact row. */}
        <div className="border rounded-lg p-3 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold">State-wise shipping</p>
            <button
              type="button"
              onClick={addStateRule}
              className="flex items-center gap-1 text-sm border rounded-lg px-3 py-2 sm:py-1.5 hover:border-brand-magenta transition-colors"
            >
              <Plus size={14} /> Add state
            </button>
          </div>
          <p className="text-xs text-brand-ink/50 mb-3">
            Set a different Price per Kg for specific states. Leave "Free above" empty (or 0) to use the
            default threshold. States without a rule use the default rates above.
          </p>

          {form.stateShipping.length === 0 && (
            <p className="text-xs text-brand-ink/40">No state-wise rules yet — every state uses the default rates.</p>
          )}

          <div className="space-y-3 sm:space-y-2">
            {form.stateShipping.map((rule, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-white/40
                           sm:grid-cols-[minmax(0,1fr)_90px_110px_auto] sm:items-center sm:border-0 sm:p-0 sm:bg-transparent"
              >
                {/* State + (mobile) delete button */}
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2 min-w-0">
                  <select
                    className={`${smallInputCls} flex-1`}
                    value={rule.state}
                    onChange={(e) => updateStateRule(idx, 'state', e.target.value)}
                  >
                    {INDIAN_STATES.filter((s) => s === rule.state || !usedStates.has(s)).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeStateRule(idx)}
                    aria-label={`Remove ${rule.state}`}
                    className="sm:hidden shrink-0 p-2 text-brand-ink/50 hover:text-brand-magenta"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="min-w-0">
                  <label className="sm:hidden block text-xs text-brand-ink/50 mb-1">₹ per kg</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="₹ / kg"
                    className={smallInputCls}
                    value={rule.pricePerKg}
                    onChange={(e) => updateStateRule(idx, 'pricePerKg', e.target.value)}
                  />
                </div>
                <div className="min-w-0">
                  <label className="sm:hidden block text-xs text-brand-ink/50 mb-1">Free above ₹</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="Free above ₹"
                    className={smallInputCls}
                    value={rule.freeShippingAbove}
                    onChange={(e) => updateStateRule(idx, 'freeShippingAbove', e.target.value)}
                  />
                </div>

                {/* Desktop delete button */}
                <button
                  type="button"
                  onClick={() => removeStateRule(idx)}
                  aria-label={`Remove ${rule.state}`}
                  className="hidden sm:block p-1 text-brand-ink/50 hover:text-brand-magenta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">SEO Title</label>
          <input className={inputCls} value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">SEO Description</label>
          <textarea rows={3} className={inputCls} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
        </div>
        <button className="btn-primary text-sm w-full sm:w-auto py-3 sm:py-2">Save Settings</button>
      </form>
    </div>
  );
}