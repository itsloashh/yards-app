import Stripe from "stripe";

// Server-side Stripe client. Uses the SECRET key (never exposed to the browser).
// In test mode this is your sk_test_... key; flip to sk_live_... to go live.
const stripeSecret = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" })
  : null;

export function stripeConfigured() {
  return !!stripeSecret;
}
