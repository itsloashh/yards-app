"use client";
import { useState } from "react";
import { Heart, Map as RouteIcon } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { haversine, fmtDist } from "@/lib/distance";
import SaleCard from "@/components/SaleCard";
import RoutePlanner from "@/components/RoutePlanner";

export default function SavedPage() {
  const { sales, savedIds, loc, unit } = useApp();
  const [showRoute, setShowRoute] = useState(false);

  const useKm = unit === "km";
  const savedSales = sales
    .filter(s => savedIds.includes(s.id))
    .map(s => {
      if (!loc) return { ...s, distance: 0, distanceText: "…" };
      const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
      return { ...s, distance: d, distanceText: fmtDist(d, unit) };
    })
    .sort((a, b) => a.distance - b.distance);

  if (!savedSales.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: "50vh" }}>
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-stone-300" />
        </div>
        <h3 className="text-lg font-bold text-stone-800 mb-1 font-display">No Saved Sales</h3>
        <p className="text-stone-500 text-sm">Tap the heart on any sale to save it!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800 font-display">Saved Sales</h2>
        {savedSales.length > 1 && (
          <button onClick={() => setShowRoute(true)}
            className="px-3.5 py-2 text-white text-sm font-bold rounded-xl shadow flex items-center gap-1.5 transition"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            <RouteIcon className="w-4 h-4" /> Plan Route
          </button>
        )}
      </div>
      {savedSales.map((s, i) => <SaleCard key={s.id} sale={s} delay={i * 0.04} />)}

      {showRoute && (
        <RoutePlanner
          savedSales={savedSales}
          startLoc={loc}
          unit={unit}
          onClose={() => setShowRoute(false)}
        />
      )}
    </div>
  );
}
