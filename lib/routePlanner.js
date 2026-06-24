import { haversine } from "@/lib/distance";

// ─── ROUTE ORDERING ───
// Greedy nearest-neighbor: start from the user's location, repeatedly hop to the
// closest unvisited sale. Simple, free, and good enough for a Saturday loop.
export function orderRoute(startLoc, sales) {
  if (!sales.length) return [];
  const remaining = [...sales];
  const ordered = [];
  let current = startLoc || (sales[0].coords);

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i].coords;
      if (!c) continue;
      const d = haversine(current.lat, current.lng, c.lat, c.lng, true);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.coords;
  }
  return ordered;
}

// Total straight-line distance of an ordered route (km), including the leg from start.
export function routeDistanceKm(startLoc, orderedSales) {
  if (!orderedSales.length) return 0;
  let total = 0;
  let current = startLoc || orderedSales[0].coords;
  for (const s of orderedSales) {
    if (!s.coords) continue;
    total += haversine(current.lat, current.lng, s.coords.lat, s.coords.lng, true);
    current = s.coords;
  }
  return total;
}

// ─── MAPS URLS ───
// Google Maps supports an origin, destination, and waypoints in between.
export function googleMapsUrl(startLoc, orderedSales) {
  if (!orderedSales.length) return "";
  const stops = orderedSales.map((s) => `${s.coords.lat},${s.coords.lng}`);
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).join("|");
  const origin = startLoc ? `${startLoc.lat},${startLoc.lng}` : stops[0];
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  return url;
}

// Apple Maps: uses daddr with "to:" chaining for multi-stop.
export function appleMapsUrl(startLoc, orderedSales) {
  if (!orderedSales.length) return "";
  const stops = orderedSales.map((s) => `${s.coords.lat},${s.coords.lng}`);
  const saddr = startLoc ? `${startLoc.lat},${startLoc.lng}` : stops[0];
  const daddr = stops.join("+to:");
  return `https://maps.apple.com/?saddr=${encodeURIComponent(saddr)}&daddr=${encodeURIComponent(daddr)}&dirflg=d`;
}

// Detect if the user is likely on an Apple device (to suggest Apple Maps first).
export function isAppleDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

// Google's waypoint cap is ~10 including destination on the free URL API.
export const MAX_ROUTE_STOPS = 10;
