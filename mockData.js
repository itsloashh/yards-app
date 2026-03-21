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
