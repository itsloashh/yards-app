// ─── SALE TYPES ───
// The type of sale, chosen at posting. Drives the icon on the map pin and detail view.
// Pin style/color stays consistent; only the glyph changes.

import { Tag, Home, Store, CalendarDays } from "lucide-react";

export const SALE_TYPES = [
  { key: "yard",   label: "Yard Sale",   icon: Tag,          desc: "Classic yard or garage sale" },
  { key: "estate", label: "Estate Sale", icon: Home,         desc: "Whole-home or estate sale" },
  { key: "market", label: "Market",      icon: Store,        desc: "Flea market, craft or vendor market" },
  { key: "event",  label: "Event",       icon: CalendarDays, desc: "Community event or special sale" },
];

export const DEFAULT_SALE_TYPE = "yard";

export function getSaleType(key) {
  return SALE_TYPES.find((t) => t.key === key) || SALE_TYPES[0];
}

export function saleTypeLabel(key) {
  return getSaleType(key).label;
}

// Raw SVG path markup for each type — used inside the Leaflet divIcon (white stroke).
// These are simplified glyphs matching the lucide icons, drawn with stroke="white".
export const SALE_TYPE_PIN_SVG = {
  // price tag
  yard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42z" transform="translate(0 0)"/><circle cx="7" cy="7" r="1.2" fill="white" stroke="none"/></svg>`,
  // house
  estate: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>`,
  // store
  market: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 4.5 4h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>`,
  // calendar
  event: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
};

export function pinSvgForType(key) {
  return SALE_TYPE_PIN_SVG[key] || SALE_TYPE_PIN_SVG.yard;
}
