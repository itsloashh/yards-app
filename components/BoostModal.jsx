"use client";
import { useState } from "react";
import { X, Rocket, Check, Loader2, Sparkles, TrendingUp, MapPin, Star } from "lucide-react";
import { BOOST_LIST } from "@/lib/boostPackages";

export default function BoostModal({ sale, user, onClose }) {
  const [selected, setSelected] = useState("weekend");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, packageId: selected, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't start checkout. Please try again.");
        setLoading(false);
        return;
      }
      // Redirect to Stripe's hosted checkout page
      window.location.href = data.url;
    } catch (err) {
      console.error("[boost] checkout error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 text-white overflow-hidden shrink-0" style={{ background: "linear-gradient(135deg, #b45309, #f59e0b, #fcd34d)" }}>
          <div className="absolute -top-10 -right-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Boost Your Sale</h2>
              <p className="text-white/85 text-sm">Get seen by more shoppers</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {/* What you get */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-amber-900 font-semibold text-xs mb-2">Every boost includes:</p>
            <div className="space-y-1.5">
              <Benefit icon={TrendingUp} text="Top placement in the Browse feed" />
              <Benefit icon={Star} text="Gold Featured badge & border" />
              <Benefit icon={MapPin} text="Priority pin on the map" />
            </div>
          </div>

          {/* Packages */}
          <div className="space-y-2.5">
            {BOOST_LIST.map((pkg) => {
              const isSel = selected === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center gap-3 ${
                    isSel ? "border-amber-400 bg-amber-50" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel ? "border-amber-500 bg-amber-500" : "border-stone-300"}`}>
                    {isSel && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-sm">{pkg.name}</p>
                    <p className="text-stone-500 text-xs">{pkg.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-stone-900 text-lg">{pkg.priceLabel}</p>
                    <p className="text-stone-400 text-[11px]">CAD</p>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2 border-t border-stone-100 shrink-0">
          <button
            onClick={startCheckout}
            disabled={loading}
            className="w-full py-4 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Starting checkout…" : "Continue to Payment"}
          </button>
          <p className="text-center text-stone-400 text-[11px] mt-2.5">
            Secure payment via Stripe. You'll be redirected to complete your purchase.
          </p>
        </div>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 text-amber-800 text-xs">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
