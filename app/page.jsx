"use client";
import { useApp } from "@/lib/AppContext";
import { haversine, fmtDist, distLabel } from "@/lib/distance";
import SaleCard from "@/components/SaleCard";
import { ArrowUpDown } from "lucide-react";

export default function HomePage() {
  const { sales, loc, dist, unit, sortBy, setSortBy } = useApp();

  const useKm = unit === "km";
  const withDist = sales.map(s => {
    if (!loc) return { ...s, distance: 0, distanceText: "…" };
    const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
    return { ...s, distance: d, distanceText: fmtDist(d, unit) };
  });

  const distInUnit = useKm ? dist * 1.60934 : dist;
  let filtered = withDist.filter(s => s.distance <= distInUnit);

  // Sort
  if (sortBy === "newest") filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else if (sortBy === "ending") filtered.sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity));
  else filtered.sort((a, b) => a.distance - b.distance);

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: "50vh" }}>
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-lime-100 rounded-full flex items-center justify-center mb-5">
          <span className="text-4xl">🏷️</span>
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2 font-display">No Sales Nearby Yet</h3>
        <p className="text-stone-500 text-sm mb-1 max-w-[260px]">Be the first to post a yard sale in your area!</p>
        <p className="text-stone-400 text-xs">Tap the <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>+</span> button below to get started.</p>
        <div className="mt-6 px-4 py-2 bg-stone-50 rounded-xl text-xs text-stone-500">
          Or try expanding your distance filter above ↑
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800 font-display">Nearby Sales</h2>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-stone-400">{filtered.length} found</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="text-[12px] text-stone-600 bg-stone-100 rounded-lg px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer">
            <option value="distance">Nearest</option>
            <option value="newest">Newest</option>
            <option value="ending">Ending Soon</option>
          </select>
        </div>
      </div>
      {filtered.map((s, i) => (
        <SaleCard key={s.id} sale={s} delay={i * 0.04} />
      ))}
    </div>
  );
}
