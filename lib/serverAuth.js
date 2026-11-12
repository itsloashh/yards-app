import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Server-only helpers for API routes. NEVER import into client components.

// Who is making this request? Reads the Supabase login token the app sends
// in the "Authorization: Bearer <token>" header and checks it with Supabase.
// Returns the user, or null if the token is missing/expired/fake.
export async function getRequestUser(req) {
  if (!supabaseAdmin) return null;
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// Is this user an admin? (checked against the database, never the browser)
export async function isAdminUser(userId) {
  if (!supabaseAdmin || !userId) return false;
  try {
    const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
    return data?.role === "admin";
  } catch {
    return false;
  }
}

// The site address to send people back to after Stripe. Only ever our own
// site: the request's own host, or shopyards.ca.
export function safeOrigin(req) {
  const fallback = "https://shopyards.ca";
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return fallback;
  try {
    const u = new URL(origin);
    if (u.host !== host) return fallback;
    if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return fallback;
    return u.origin;
  } catch {
    return fallback;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
