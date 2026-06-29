// ─── SALE TYPES ───
// The type of sale, chosen at posting. Drives the icon on the map pin and detail view.
// Pin style/color stays consistent; only the glyph changes.

import { DollarSign, Home, Carrot, Tent } from "lucide-react";

export const SALE_TYPES = [
  { key: "yard",   label: "Yard Sale",   icon: DollarSign, desc: "Classic yard or garage sale" },
  { key: "estate", label: "Estate Sale", icon: Home,       desc: "Whole-home or estate sale" },
  { key: "market", label: "Market",      icon: Carrot,     desc: "Farmers, craft & arts vendor markets" },
  { key: "event",  label: "Event",       icon: Tent,       desc: "Community event or special sale" },
];

export const DEFAULT_SALE_TYPE = "yard";

export function getSaleType(key) {
  return SALE_TYPES.find((t) => t.key === key) || SALE_TYPES[0];
}

export function saleTypeLabel(key) {
  return getSaleType(key).label;
}

// Raw SVG path markup for each type — used inside the Leaflet divIcon (white stroke).
export const SALE_TYPE_PIN_SVG = {
  // dollar sign
  yard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1.5" x2="12" y2="22.5"/><path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  // house
  estate: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>`,
  // carrot (farmers / arts vendor markets)
  market: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.27 21.7s4.5-1 6.5-3 3.5-6.5 3.5-6.5-4.5.5-6.5 2.5-3.5 7-3.5 7z"/><path d="m12 12 4-4"/><path d="M14 10c1-3 3-4 5-4"/><path d="M17 7c0-2 1-3 3-3"/></svg>`,
  // circus tent
  event: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 19h18z"/><path d="M12 3v16"/><path d="M8.5 19c0-3 1.5-6 3.5-9 2 3 3.5 6 3.5 9"/></svg>`,
};

export function pinSvgForType(key) {
  return SALE_TYPE_PIN_SVG[key] || SALE_TYPE_PIN_SVG.yard;
}

// ─── PIN COLOR BY TYPE ───
// Event pins get their own purple identity + pulse. Other types use the
// standard status colors (handled in MapView). Returns a color or null.
export const SALE_TYPE_PIN_COLOR = {
  event: "#9333ea", // purple-600
};

export function pinColorForType(key) {
  return SALE_TYPE_PIN_COLOR[key] || null;
}
