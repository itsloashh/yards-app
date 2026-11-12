// Shared rules for which sales show up on the home feed and the map.
// One place, so the list and the map can never disagree.
import { haversine, fmtDist } from "./distance";

// "YYYY-MM-DD" for a Date in the user's own time zone (not UTC).
export function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "past" | "upcoming" | "active"
export function saleStatus(s, now = Date.now()) {
  if (s.expiresAt && s.expiresAt <= now) return "past";
  if (s.dateRaw) {
    const startStr = s.startTime && /^\d{2}:\d{2}/.test(s.startTime)
      ? `${s.dateRaw}T${s.startTime}`
      : `${s.dateRaw}T00:00`;
    const startMs = new Date(startStr).getTime();
    if (!isNaN(startMs) && startMs > now) return "upcoming";
  }
  return "active";
}

// Free-text search across title, description, address, categories and featured items.
// Every word typed has to appear somewhere.
export function matchesSearch(s, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = [
    s.title, s.description, s.address,
    ...(s.tags || []),
    ...(s.featuredItems || []).map((f) => (typeof f === "string" ? f : f?.name)),
  ].filter(Boolean).join(" \n ").toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function matchesCategory(s, category) {
  if (!category) return true;
  const c = category.toLowerCase();
  return (s.tags || []).some((t) => String(t).toLowerCase() === c);
}

// The Saturday and Sunday of this weekend (today's, if it's already the weekend).
function weekendRange(now) {
  const d = new Date(now);
  const dow = d.getDay(); // 0 = Sunday
  const sat = new Date(d);
  const sun = new Date(d);
  if (dow === 0) { sat.setDate(d.getDate() - 1); }
  else { sat.setDate(d.getDate() + (6 - dow)); sun.setDate(d.getDate() + (7 - dow)); }
  return [localDateStr(sat), localDateStr(sun)];
}

export const WHEN_OPTIONS = [
  { id: "now", label: "Open now" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
  { id: "ending", label: "Ending soon" },
];

// How close to closing counts as "ending soon" — matches the red map pins.
export const ENDING_SOON_MS = 2 * 3600000;

export function matchesWhen(s, when, now = Date.now()) {
  if (!when) return true;
  const status = saleStatus(s, now);
  if (status === "past") return false;
  if (when === "now") return status === "active";
  if (when === "ending") {
    return status === "active" && !!s.expiresAt && s.expiresAt - now <= ENDING_SOON_MS;
  }
  const start = s.dateRaw || null;
  const end = s.endDateRaw || s.dateRaw || null;
  if (when === "today") {
    if (!start) return status === "active";
    const today = localDateStr(new Date(now));
    return start <= today && today <= end;
  }
  if (when === "weekend") {
    if (!start) return false;
    const [sat, sun] = weekendRange(now);
    return start <= sun && end >= sat;
  }
  return true;
}

// Adds distance + distance text to each sale, then keeps the ones inside the
// chosen radius. `dist` is already in the chosen unit (10 means 10 km OR 10 mi).
export function withinDistance(list, { loc, dist, unit }) {
  const useKm = unit === "km";
  const showAll = !isFinite(dist); // "Anywhere"
  const out = list.map((s) => {
    if (!loc || !s.coords || typeof s.coords.lat !== "number" || typeof s.coords.lng !== "number") {
      return { ...s, distance: showAll ? 0 : Infinity, distanceText: loc ? "—" : "…" };
    }
    const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
    const safeD = isFinite(d) ? d : (showAll ? 0 : Infinity);
    return { ...s, distance: safeD, distanceText: isFinite(d) ? fmtDist(d, unit) : "—" };
  });
  return showAll ? out : out.filter((s) => s.distance <= dist);
}

// The chosen radius in metres (for the circle on the map). null = "Anywhere".
export function radiusMeters(dist, unit) {
  if (!isFinite(dist)) return null;
  return unit === "km" ? dist * 1000 : dist * 1609.34;
}
