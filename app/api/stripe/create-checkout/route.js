import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripeServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPackage, BOOST_CURRENCY } from "@/lib/boostPackages";
import { getRequestUser, safeOrigin, UUID_RE } from "@/lib/serverAuth";

export const runtime = "nodejs";

// How many unpaid checkouts one account may start per hour.
const MAX_PENDING_PER_HOUR = 8;

export async function POST(req) {
  try {
    if (!stripeConfigured() || !stripe || !supabaseAdmin) {
      return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
    }

    // Who is asking? Taken from their login token — never from the request body.
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ error: "Please sign in again to boost your sale." }, { status: 401 });
    }
    const userId = user.id;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    const { saleId, packageId } = body || {};

    if (!saleId || !packageId || typeof saleId !== "string" || !UUID_RE.test(saleId)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const pkg = getPackage(packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid boost package." }, { status: 400 });
    }

    // Verify the sale exists and belongs to this user (server-side, can't be spoofed)
    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("sales")
      .select("id, user_id, title")
      .eq("id", saleId)
      .single();

    if (saleErr || !sale) {
      return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    }
    if (sale.user_id !== userId) {
      return NextResponse.json({ error: "You can only boost your own sales." }, { status: 403 });
    }

    // Throttle: stop one account from opening endless unpaid checkouts
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentPending } = await supabaseAdmin
      .from("boosts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("created_at", hourAgo);
    if ((recentPending || 0) >= MAX_PENDING_PER_HOUR) {
      return NextResponse.json({ error: "Too many checkout attempts. Please try again in a little while." }, { status: 429 });
    }

    const origin = safeOrigin(req);

    // Create the Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: BOOST_CURRENCY,
            product_data: {
              name: `Yard$ ${pkg.name}`,
              description: `Boost "${String(sale.title || "").slice(0, 120)}" — ${pkg.tagline}`,
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/sale/${saleId}?boost=success`,
      cancel_url: `${origin}/sale/${saleId}?boost=cancelled`,
      metadata: {
        saleId,
        userId,
        packageId,
        durationHours: String(pkg.durationHours),
      },
    });

    // Record a pending boost (will be activated by the webhook on payment success)
    const { error: insertErr } = await supabaseAdmin.from("boosts").insert({
      sale_id: saleId,
      user_id: userId,
      package_id: packageId,
      amount_cents: pkg.priceCents,
      currency: BOOST_CURRENCY,
      status: "pending",
      stripe_session_id: session.id,
    });
    if (insertErr) console.error("[create-checkout] could not record pending boost:", insertErr);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout] error:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
