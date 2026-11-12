import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripeServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPackage, BOOST_CURRENCY } from "@/lib/boostPackages";

export const runtime = "nodejs";

// Stripe requires the RAW request body to verify the webhook signature.
export async function POST(req) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !supabaseAdmin || !webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Checkout was abandoned and timed out — mark the pending boost so it
  // doesn't sit as "pending" forever. ("failed" is never counted as revenue.)
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    await supabaseAdmin
      .from("boosts")
      .update({ status: "failed" })
      .eq("stripe_session_id", session.id)
      .eq("status", "pending");
    return NextResponse.json({ received: true });
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;

    // Only activate once the money has actually arrived.
    if (session.payment_status !== "paid") {
      console.log(`[webhook] session ${session.id} not paid yet (${session.payment_status}) — waiting`);
      return NextResponse.json({ received: true });
    }

    const { saleId, userId, packageId, durationHours } = session.metadata || {};

    if (!saleId || !packageId) {
      console.error("[webhook] missing metadata on session", session.id);
      return NextResponse.json({ received: true });
    }

    // Duration comes from our own package list first; the metadata is a fallback.
    const pkg = getPackage(packageId);
    const hours = pkg?.durationHours || parseInt(durationHours, 10) || 24;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + hours * 3600000);
    const activeFields = {
      status: "active",
      stripe_payment_intent: session.payment_intent || null,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    let claimedId = null;
    try {
      // 1. Claim this checkout exactly once. Stripe can send the same
      //    notification more than once — only the first one gets past here.
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from("boosts")
        .update(activeFields)
        .eq("stripe_session_id", session.id)
        .eq("status", "pending")
        .select("id");
      if (claimErr) throw claimErr;

      if (claimed?.length) {
        claimedId = claimed[0].id;
      } else {
        const { data: existing, error: existErr } = await supabaseAdmin
          .from("boosts")
          .select("id, status")
          .eq("stripe_session_id", session.id)
          .limit(1);
        if (existErr) throw existErr;

        if (existing?.length) {
          // Already handled by an earlier notification — do nothing.
          console.log(`[webhook] session ${session.id} already processed — skipping`);
          return NextResponse.json({ received: true });
        }

        // No row was recorded at checkout time — record it now.
        if (!userId) {
          console.error("[webhook] no boost row and no userId for session", session.id);
          return NextResponse.json({ received: true });
        }
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("boosts")
          .insert({
            sale_id: saleId,
            user_id: userId,
            package_id: packageId,
            amount_cents: session.amount_total ?? pkg?.priceCents ?? 0,
            currency: session.currency || BOOST_CURRENCY,
            stripe_session_id: session.id,
            ...activeFields,
          })
          .select("id");
        if (insErr) {
          if (insErr.code === "23505") {
            // Another notification recorded it a moment ago.
            return NextResponse.json({ received: true });
          }
          throw insErr;
        }
        claimedId = inserted?.[0]?.id || null;
      }

      // 2. Stamp the sale so the app knows it's boosted.
      //    If the sale already has a later boost, stack the new time on top.
      const { data: existingSale, error: saleErr } = await supabaseAdmin
        .from("sales")
        .select("boosted_until")
        .eq("id", saleId)
        .maybeSingle();
      if (saleErr) throw saleErr;

      if (!existingSale) {
        // Sale was deleted between paying and this notification.
        console.error(`[webhook] paid boost for missing sale ${saleId} (session ${session.id})`);
        return NextResponse.json({ received: true });
      }

      let newBoostedUntil = expiresAt;
      if (existingSale.boosted_until) {
        const current = new Date(existingSale.boosted_until);
        if (current > now) {
          newBoostedUntil = new Date(current.getTime() + hours * 3600000);
        }
      }

      const { error: stampErr } = await supabaseAdmin
        .from("sales")
        .update({
          boosted_until: newBoostedUntil.toISOString(),
          boost_package: packageId,
        })
        .eq("id", saleId);
      if (stampErr) throw stampErr;

      console.log(`[webhook] boost activated for sale ${saleId} until ${newBoostedUntil.toISOString()}`);
    } catch (err) {
      console.error("[webhook] failed to activate boost:", err);
      // Put the claim back so Stripe's automatic retry can finish the job.
      if (claimedId) {
        await supabaseAdmin
          .from("boosts")
          .update({ status: "pending", starts_at: null, expires_at: null })
          .eq("id", claimedId);
      }
      return NextResponse.json({ error: "Activation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
