// Shared jewellery vocabulary. Imported by the bulk API route and the admin
// forms so the dropdowns and the server-side validation can never drift apart.
// Safe to import from client components (no server-only code in here).

export const MATERIALS = [
  'Silk Thread',
  'Lac',
  'Glass',
  'Brass',
  'Copper',
  'Silver',
  'German Silver',
  'Metal Alloy',
  'Terracotta',
  'Wood',
  'Acrylic',
  'Beads / Pearls',
  'Fabric',
];

export const FINISHES = [
  'Gold Plated',
  'Rose Gold Plated',
  'Silver Plated',
  'Oxidised',
  'Antique Gold',
  'Matte',
  'Natural / No Plating',
];

export const STONE_TYPES = [
  'Kundan',
  'Meenakari',
  'American Diamond (CZ)',
  'Pearls',
  'Beads',
  'Crystals',
  'Polki',
  'Mirror Work',
];

export const OCCASIONS = ['Daily Wear', 'Festive', 'Wedding', 'Party', 'Office', 'Gifting'];

// Standard Indian bangle sizes. Stored as the `size` of a variant size entry.
export const BANGLE_SIZES = ['2.2', '2.4', '2.6', '2.8', '2.10'];