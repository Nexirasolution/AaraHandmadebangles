'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

// Design tokens — keep in sync with the homepage, ProductPage, Navbar and Footer.
//   Primary    #C2185B  focus, checkbox, button hover
//   Secondary  #D4A017  thin divider (decorative only)
//   Background #FFFFFF  pure white page and form card
//   Text       #2D1028  headings, inputs, dark button
//   Accent     #F8D7E3  focus ring, soft washes
const PRIMARY = '#C2185B';
const GOLD = '#D4A017';
const INK = '#2D1028';
const ACCENT = '#F8D7E3';
const WHITE = '#FFFFFF';

const INK_SOFT = 'rgba(45, 16, 40, 0.68)';
const HAIRLINE = 'rgba(45, 16, 40, 0.18)';
const CARD_LINE = 'rgba(45, 16, 40, 0.12)';
const ERROR = '#B00020';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP || '918778695195';

const FALLBACK_PRODUCTS = ['Kurtis', 'Nighties', 'Innerwear', 'Other'];

// Fully rounded inputs; the multi-line message box gets a softer 20px radius.
const inputBase =
  'w-full px-5 py-3 text-sm font-medium bg-white outline-none transition-all placeholder:font-medium focus:border-[#C2185B] focus:ring-4 focus:ring-[#F8D7E3]';
const inputClass = `${inputBase} rounded-full`;
const textareaClass = `${inputBase} rounded-[20px] resize-none`;

const inputStyle = { color: INK, border: `1px solid ${HAIRLINE}` };

// Defined OUTSIDE the page component so it isn't re-created on every render
// (re-creating it caused inputs to lose focus after each keystroke).
function Field({ error, children }) {
  return (
    <div>
      {children}
      {error && (
        <p className="text-[11px] font-bold mt-1.5 px-5" style={{ color: ERROR }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function BulkEnquiryPage() {
  const [productTypes, setProductTypes] = useState(FALLBACK_PRODUCTS);
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    pincode: '',
    phone: '',
    product: '',
    quantity: '',
    message: '',
    agree: false,
  });
  const [errors, setErrors] = useState({});

  // Use the store's own categories as product types, if available
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        const names = (d.topLevel || []).map((c) => c.name).filter(Boolean);
        if (names.length) setProductTypes([...names, 'Other']);
      })
      .catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (!form.address.trim()) e.address = 'Please enter your address';
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Enter a 6-digit pincode';
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '').slice(-10)))
      e.phone = 'Enter a valid 10-digit phone number';
    if (!form.product) e.product = 'Select a product type';
    if (!form.quantity || Number(form.quantity) < 1) e.quantity = 'Enter the quantity required';
    if (!form.agree) e.agree = 'Please accept the Terms & Conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;

    const lines = [
      '*Bulk Order Enquiry*',
      '',
      `*Name:* ${form.name.trim()}`,
      `*Email:* ${form.email.trim()}`,
      `*Phone:* ${form.phone.trim()}`,
      `*Address:* ${form.address.trim()}`,
      `*Pincode:* ${form.pincode.trim()}`,
      `*Product Type:* ${form.product}`,
      `*Quantity Required:* ${form.quantity}`,
    ];
    if (form.message.trim()) lines.push('', `*Message:* ${form.message.trim()}`);

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="min-h-screen" style={{ background: WHITE }}>
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-14">
        <h1
          className="text-2xl sm:text-3xl font-bold text-center tracking-[2px] uppercase mb-3"
          style={{ color: INK }}
        >
          Bulk Order Enquiry
        </h1>
        <div className="w-12 h-[2px] rounded-full mx-auto mb-6" style={{ background: GOLD }} />
        <p className="text-center text-sm font-medium mb-8" style={{ color: INK_SOFT }}>
          Fill in your details and we&apos;ll get back to you on WhatsApp.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-4 p-5 sm:p-8 rounded-[24px]"
          style={{
            background: WHITE,
            border: `1px solid ${CARD_LINE}`,
            boxShadow: '0 18px 40px rgba(45, 16, 40, 0.07)',
          }}
        >
          <Field error={errors.name}>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="First Name*"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>

          <Field error={errors.email}>
            <input
              type="email"
              className={inputClass}
              style={inputStyle}
              placeholder="Email*"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </Field>

          <Field error={errors.address}>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Full Address*"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </Field>

          <Field error={errors.pincode}>
            <input
              inputMode="numeric"
              maxLength={6}
              className={inputClass}
              style={inputStyle}
              placeholder="Pincode*"
              value={form.pincode}
              onChange={(e) => update('pincode', e.target.value.replace(/\D/g, ''))}
            />
          </Field>

          <Field error={errors.phone}>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={13}
              className={inputClass}
              style={inputStyle}
              placeholder="Phone Number*"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value.replace(/[^\d+\s]/g, ''))}
            />
          </Field>

          <Field error={errors.product}>
            <select
              className={inputClass}
              style={{ ...inputStyle, color: form.product ? INK : INK_SOFT }}
              value={form.product}
              onChange={(e) => update('product', e.target.value)}
            >
              <option value="">Product Type*</option>
              {productTypes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field error={errors.quantity}>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              className={inputClass}
              style={inputStyle}
              placeholder="Quantity Required*"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
          </Field>

          <textarea
            rows={5}
            className={textareaClass}
            style={inputStyle}
            placeholder="Message"
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
          />

          <Field error={errors.agree}>
            <label
              className="flex items-start gap-2.5 text-[13px] font-bold cursor-pointer px-1"
              style={{ color: INK }}
            >
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded shrink-0 accent-[#C2185B]"
                checked={form.agree}
                onChange={(e) => update('agree', e.target.checked)}
              />
              <span>I agree to the Terms &amp; Conditions and Privacy Policy.*</span>
            </label>
          </Field>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold tracking-[1.5px] uppercase transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(194,24,91,0.25)] bg-[#2D1028] text-white hover:bg-[#C2185B]"
          >
            <MessageCircle size={16} strokeWidth={2} />
            Submit
          </button>
        </form>
      </div>
    </main>
  );
}