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
    // Fetch sales and filter for missing city in JS — more reliable than
    // Supabase .or() with empty-string matching, which can silently miss rows.
    const { data: allSales, error } = await supabaseAdmin
      .from("sales")
      .select("id, lat, lng, city");

    if (error) throw error;

    const needsCity = (allSales || []).filter(
      (s) => (!s.city || s.city.trim() === "") && typeof s.lat === "number" && typeof s.lng === "number"
    );

    if (needsCity.length === 0) {
      return NextResponse.json({ done: true, updated: 0, remaining: 0, message: "All sales already have a city." });
    }

    // Process up to 40 per run to stay within time limits
    const batch = needsCity.slice(0, 40);

    let updated = 0;
    for (const s of batch) {
      const { city, region } = await reverseCity(s.lat, s.lng);
      if (city) {
        await supabaseAdmin.from("sales").update({ city, region }).eq("id", s.id);
        updated++;
      }
      // Nominatim asks for ~1 req/sec
      await new Promise((res) => setTimeout(res, 1100));
    }

    const remaining = needsCity.length - updated;

    return NextResponse.json({
      done: remaining === 0,
      updated,
      remaining,
      message: remaining === 0
        ? `Done — updated ${updated} sale${updated !== 1 ? "s" : ""} with their city.`
        : `Updated ${updated} sales. ${remaining} still need backfilling — run again to continue.`,
    });
  } catch (err) {
    console.error("[backfill-cities] error:", err);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
