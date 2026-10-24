export const dynamic = 'force-dynamic';
import { dbConnect } from '@/lib/mongodb';
import Order from '@/models/Order';
import Settings from '@/models/Settings';
import { formatINR } from '@/lib/utils';
import PrintButton from '@/components/PrintButton';

// Palette: 60% white/cream · 25% navy · 10% gold · 5% pale gold
// Printed label: text stays deep navy for scanner/print contrast.
const WHITE = '#FFFFFF';
const CREAM = '#F8F6EF';
const NAVY = '#102A56';
const NAVY_DARK = '#071A3A';
const GOLD = '#C9A227';
const GOLD_PALE = '#E6D39A';

const INK = NAVY_DARK;
const INK_SOFT = 'rgba(16, 42, 86, 0.70)'; // slightly stronger than on-screen pages, for print
const LINE = GOLD_PALE;
const PAPER = WHITE;
const WASH = CREAM;
const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

export default async function CourierBillPage({ params }) {
  await dbConnect();
  const order = await Order.findById(params.orderId).lean();
  const settings = await Settings.findOne({ key: 'global' }).lean();

  if (!order) {
    return (
      <div className="p-10 text-center text-sm" style={{ color: INK_SOFT }}>
        Shipping label not found.
      </div>
    );
  }

  const addr = order.shippingAddress || {};
  const streetLine = [addr.line1, addr.line2].filter(Boolean).join(', ');
  const cityLine = [addr.city, addr.state].filter(Boolean).join(', ') + (addr.pincode ? ` - ${addr.pincode}` : '');
  const isCod = order.paymentMethod === 'cod';

  return (
    <div
      className="max-w-md mx-auto m-6 print:m-0 print:max-w-none"
      style={{ background: PAPER, border: `1px solid ${LINE}`, borderTop: `4px solid ${NAVY_DARK}`, borderRadius: '4px', color: INK }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-7 py-4"
        style={{ borderBottom: `2px solid ${GOLD}` }}
      >
        <h1 className="text-lg tracking-tight" style={{ fontFamily: FONT_SERIF, color: INK }}>
          Shipping Label
        </h1>
        <span
          className="text-[11px] font-mono px-2.5 py-1"
          style={{ background: WASH, color: INK, border: `1px solid ${GOLD}`, borderRadius: '2px' }}
        >
          {order.orderNumber}
        </span>
      </div>

      <div className="px-7 pt-5 pb-7">

        {/* Deliver to: the main block, so it is the first thing the courier reads */}
        <p className="text-xs font-medium mb-1.5" style={{ color: NAVY }}>Deliver to</p>
        <div className="p-4" style={{ border: `1.5px solid ${NAVY_DARK}`, borderRadius: '3px' }}>
          <p className="text-base font-semibold" style={{ color: INK }}>{order.customer?.name}</p>
          <p className="text-sm mt-0.5 font-medium" style={{ color: INK }}>{order.customer?.phone}</p>
          <p className="text-sm mt-2" style={{ color: INK }}>{streetLine}</p>
          <p className="text-sm" style={{ color: INK }}>{cityLine}</p>
          {addr.landmark && (
            <p className="text-sm mt-1" style={{ color: INK_SOFT }}>
              Landmark: {addr.landmark}
            </p>
          )}
        </div>

        {/* From */}
        <p className="text-xs font-medium mt-5 mb-1" style={{ color: NAVY }}>Sent by</p>
        <p className="text-sm" style={{ color: INK }}>{settings?.storeName || 'Aara Handmade Bangles'}</p>
        <p className="text-sm" style={{ color: INK_SOFT }}>{settings?.address || 'Tamil Nadu'}</p>

        {/* Shipment details */}
        <div className="mt-5 pt-4 text-sm space-y-2" style={{ borderTop: `1px dashed ${INK_SOFT}` }}>
          <div className="flex justify-between">
            <span style={{ color: INK_SOFT }}>Items</span>
            <span style={{ color: INK }}>{order.items.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: INK_SOFT }}>Payment</span>
            {isCod ? (
              <span
                className="font-semibold px-2.5 py-1"
                style={{ background: WASH, color: INK, border: `1px solid ${GOLD}`, borderRadius: '2px' }}
              >
                COD - {formatINR(order.total)}
              </span>
            ) : (
              <span style={{ color: INK }}>Prepaid</span>
            )}
          </div>
          <div className="flex justify-between">
            <span style={{ color: INK_SOFT }}>Courier Partner</span>
            <span style={{ color: INK }}>{order.courier?.partner || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: INK_SOFT }}>AWB / Tracking No.</span>
            <span className="font-mono font-medium" style={{ color: INK }}>{order.courier?.awbNumber || '—'}</span>
          </div>
        </div>

        {/* Hidden when printing so the label stays clean */}
        <div className="mt-6 print:hidden">
          <PrintButton label="Print Label" />
        </div>
      </div>
    </div>
  );
}