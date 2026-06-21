import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripeServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPackage, BOOST_CURRENCY } from "@/lib/boostPackages";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    if (!stripeConfigured() || !stripe || !supabaseAdmin) {
      return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
    }

    const body = await req.json();
    const { saleId, packageId, userId } = body;

    if (!saleId || !packageId || !userId) {
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

    const origin = req.headers.get("origin") || "https://shopyards.ca";

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
              description: `Boost "${sale.title}" — ${pkg.tagline}`,
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
    await supabaseAdmin.from("boosts").insert({
      sale_id: saleId,
      user_id: userId,
      package_id: packageId,
      amount_cents: pkg.priceCents,
      currency: BOOST_CURRENCY,
      status: "pending",
      stripe_session_id: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout] error:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
