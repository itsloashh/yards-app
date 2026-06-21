// ─── BOOST PACKAGES ───
// Single source of truth for what users can buy. Prices in CENTS (Stripe uses cents).
// Edit prices/durations here; they flow to the picker, checkout, and admin.

export const BOOST_PACKAGES = {
  "24h": {
    id: "24h",
    name: "24-Hour Boost",
    tagline: "Quick visibility bump",
    durationHours: 24,
    priceCents: 1000, // $10.00
    priceLabel: "$10",
  },
  weekend: {
    id: "weekend",
    name: "Weekend Boost",
    tagline: "Perfect for a 3-day sale",
    durationHours: 72,
    priceCents: 2000, // $20.00
    priceLabel: "$20",
  },
  "7day": {
    id: "7day",
    name: "7-Day Boost",
    tagline: "Maximum exposure",
    durationHours: 168,
    priceCents: 5000, // $50.00
    priceLabel: "$50",
  },
};

export const BOOST_LIST = Object.values(BOOST_PACKAGES);

export function getPackage(id) {
  return BOOST_PACKAGES[id] || null;
}

// Currency for Stripe
export const BOOST_CURRENCY = "cad";

// Helper: is a sale currently boosted? (boostedUntil is ms timestamp or ISO string)
export function isBoosted(boostedUntil) {
  if (!boostedUntil) return false;
  const ms = typeof boostedUntil === "number" ? boostedUntil : new Date(boostedUntil).getTime();
  return ms > Date.now();
}
