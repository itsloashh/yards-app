export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    const a = d.address || {};
    const road = a.road || a.pedestrian || a.neighbourhood || "";
    const city = a.city || a.town || a.village || a.hamlet || "";
    const state = a.state || "";
    return {
      short: road ? `${road}, ${city}` : city || d.display_name?.split(",").slice(0, 2).join(","),
      full: d.display_name,
      city,
      state,
    };
  } catch {
    return { short: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, full: "", city: "", state: "" };
  }
}

// Forward geocode a specific address (street + city) to lat/lng coordinates.
// Returns { lat, lng, display, success } where success indicates if the address was found.
export async function geocodeAddress(address) {
  const q = address?.trim();
  if (!q || q.length < 4) return { success: false, lat: null, lng: null, display: "" };
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await r.json();
    if (!data || !data.length) return { success: false, lat: null, lng: null, display: "" };
    const item = data[0];
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lng)) return { success: false, lat: null, lng: null, display: "" };
    return {
      success: true,
      lat,
      lng,
      display: item.display_name || q,
    };
  } catch (err) {
    console.error("[geocodeAddress] failed:", err);
    return { success: false, lat: null, lng: null, display: "" };
  }
}

// Forward geocoding - search for places by text query (used for location autocomplete on signup)
export async function searchLocations(query) {
  const q = query?.trim();
  if (!q || q.length < 2) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await r.json();
    const results = (data || [])
      .map((item) => {
        const a = item.address || {};
        const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || "";
        const region = a.state || a.province || a.region || "";
        const country = a.country || "";
        // Use display_name as the fallback label if the address object is light
        const parts = [city, region, country].filter(Boolean);
        const label = parts.length ? parts.join(", ") : (item.display_name || "").split(",").slice(0, 3).map(s => s.trim()).join(", ");
        return {
          label,
          city: city || (item.display_name || "").split(",")[0]?.trim() || "",
          region,
          country,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      })
      .filter((r) => r.label); // Only require a label, not specifically a city
    // Deduplicate by label
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.label)) return false;
      seen.add(r.label);
      return true;
    });
  } catch (err) {
    console.error("[searchLocations] failed:", err);
    return [];
  }
}
