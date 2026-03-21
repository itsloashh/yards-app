export function haversine(lat1, lng1, lat2, lng2, useKm = false) {
  const R = useKm ? 6371 : 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtDist(d, unit) {
  const u = unit === "km" ? "km" : "mi";
  return d < 0.1 ? `< 0.1 ${u}` : `${d.toFixed(1)} ${u}`;
}

export function distLabel(val, unit) {
  return `${val} ${unit === "km" ? "km" : "mi"}`;
}
