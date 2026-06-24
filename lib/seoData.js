import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client for SEO pages (read-only, anon key).
// Separate from the browser client so these run at request/build time on the server.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function serverClient() {
  return createClient(url, anon, { auth: { persistSession: false } });
}

// ─── SLUG HELPERS ───
// "Windsor" <-> "windsor", "St. Thomas" <-> "st-thomas"
export function citySlug(city) {
  return (city || "")
    .toLowerCase()
    .trim()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleCaseCity(slug) {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── DATA FETCHERS (server-side) ───

// All currently-active sales (not expired). Used for city grouping + sitemap.
export async function getActiveSales() {
  try {
    const supabase = serverClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("sales")
      .select("id, title, description, address, city, region, date_display, date_raw, end_date_raw, start_time, end_time, tags, photos, lat, lng, expires_at, boosted_until, created_at")
      .or(`expires_at.gt.${nowIso},expires_at.is.null`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[seo getActiveSales] error:", err);
    return [];
  }
}

// Sales for a specific city slug.
export async function getSalesByCitySlug(slug) {
  const all = await getActiveSales();
  return all.filter((s) => citySlug(s.city) === slug);
}

// Distinct cities that currently have active sales (for sitemap + index).
export async function getActiveCities() {
  const all = await getActiveSales();
  const map = new Map();
  for (const s of all) {
    if (!s.city) continue;
    const slug = citySlug(s.city);
    if (!slug) continue;
    if (!map.has(slug)) {
      map.set(slug, { slug, city: s.city, region: s.region || "", count: 0 });
    }
    map.get(slug).count += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// A single sale by id (for server-rendered sale pages).
export async function getSaleById(id) {
  try {
    const supabase = serverClient();
    const { data, error } = await supabase
      .from("sales")
      .select("id, title, description, address, city, region, date_display, date_raw, end_date_raw, start_time, end_time, tags, photos, lat, lng, expires_at, boosted_until, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[seo getSaleById] error:", err);
    return null;
  }
}
