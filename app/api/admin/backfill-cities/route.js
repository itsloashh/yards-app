import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-time backfill: geocode existing sales that have no city yet.
// Called from the admin dashboard. Rate-limited to be gentle on Nominatim.
async function reverseCity(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "YardsApp/1.0 (shopyards.ca)" } }
    );
    const d = await r.json();
    const a = d.address || {};
    const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || "";
    const region = a.state || a.region || a.province || "";
    return { city, region };
  } catch {
    return { city: "", region: "" };
  }
}

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  try {
    // Get sales missing a city but having coordinates
    const { data: sales, error } = await supabaseAdmin
      .from("sales")
      .select("id, lat, lng, city")
      .or("city.is.null,city.eq.")
      .limit(40); // process in batches to stay within time limits

    if (error) throw error;
    if (!sales || sales.length === 0) {
      return NextResponse.json({ done: true, updated: 0, remaining: 0, message: "All sales already have a city." });
    }

    let updated = 0;
    for (const s of sales) {
      if (typeof s.lat !== "number" || typeof s.lng !== "number") continue;
      const { city, region } = await reverseCity(s.lat, s.lng);
      if (city) {
        await supabaseAdmin.from("sales").update({ city, region }).eq("id", s.id);
        updated++;
      }
      // Nominatim asks for ~1 req/sec
      await new Promise((res) => setTimeout(res, 1100));
    }

    // Check how many still remain
    const { count } = await supabaseAdmin
      .from("sales")
      .select("id", { count: "exact", head: true })
      .or("city.is.null,city.eq.");

    return NextResponse.json({
      done: (count || 0) === 0,
      updated,
      remaining: count || 0,
      message: `Updated ${updated} sales. ${count || 0} still need backfilling — run again to continue.`,
    });
  } catch (err) {
    console.error("[backfill-cities] error:", err);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
