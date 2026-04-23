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

// Forward geocoding - search for places by text query (used for location autocomplete on signup)
export async function searchLocations(query) {
  const q = query?.trim();
  if (!q || q.length < 2) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&featuretype=city`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await r.json();
    return (data || [])
      .map((item) => {
        const a = item.address || {};
        const city = a.city || a.town || a.village || a.hamlet || a.municipality || "";
        const region = a.state || a.province || a.region || "";
        const country = a.country || "";
        // Build a clean "City, Region, Country" label
        const parts = [city, region, country].filter(Boolean);
        const label = parts.join(", ");
        return {
          label,
          city,
          region,
          country,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      })
      .filter((r) => r.label && r.city); // Require at least a city name
  } catch {
    return [];
  }
}
