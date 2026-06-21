import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the SERVICE ROLE key.
// This bypasses RLS — used by the Stripe webhook to activate boosts after payment.
// NEVER import this into client components. The service role key must stay server-side.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = (url && serviceKey)
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;
