import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripeServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Stripe requires the RAW request body to verify the webhook signature.
export async function POST(req) {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { saleId, userId, packageId, durationHours } = session.metadata || {};

    if (!saleId || !packageId) {
      console.error("[webhook] missing metadata on session", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      const now = new Date();
      const hours = parseInt(durationHours, 10) || 24;
      const expiresAt = new Date(now.getTime() + hours * 3600000);

      // 1. Mark the boost row as active
      await supabaseAdmin
        .from("boosts")
        .update({
          status: "active",
          stripe_payment_intent: session.payment_intent || null,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("stripe_session_id", session.id);

      // 2. Stamp the sale so the app knows it's boosted.
      //    If the sale already has a later boost, keep the later one (stacking extends).
      const { data: existing } = await supabaseAdmin
        .from("sales")
        .select("boosted_until")
        .eq("id", saleId)
        .single();

      let newBoostedUntil = expiresAt;
      if (existing?.boosted_until) {
        const current = new Date(existing.boosted_until);
        // If there's an active boost, stack the new duration on top of it
        if (current > now) {
          newBoostedUntil = new Date(current.getTime() + hours * 3600000);
        }
      }

      await supabaseAdmin
        .from("sales")
        .update({
          boosted_until: newBoostedUntil.toISOString(),
          boost_package: packageId,
        })
        .eq("id", saleId);

      console.log(`[webhook] boost activated for sale ${saleId} until ${newBoostedUntil.toISOString()}`);
    } catch (err) {
      console.error("[webhook] failed to activate boost:", err);
      return NextResponse.json({ error: "Activation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
