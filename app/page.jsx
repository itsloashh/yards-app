"use client";
import { useApp } from "@/lib/AppContext";
import { haversine, fmtDist, distLabel } from "@/lib/distance";
import SaleCard from "@/components/SaleCard";

export default function HomePage() {
  const { sales, loc, dist, unit, sortBy, setSortBy, authLoading } = useApp();

  const useKm = unit === "km";
  const withDist = sales.map(s => {
    if (!loc) return { ...s, distance: 0, distanceText: "…" };
    const d = haversine(loc.lat, loc.lng, s.coords.lat, s.coords.lng, useKm);
    return { ...s, distance: d, distanceText: fmtDist(d, unit) };
  });

  const distInUnit = useKm ? dist * 1.60934 : dist;
  let filtered = withDist.filter(s => s.distance <= distInUnit);

  if (sortBy === "newest") filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else if (sortBy === "ending") filtered.sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity));
  else if (sortBy === "upcoming") filtered.sort((a, b) => {
    const aDate = a.dateRaw ? new Date(a.dateRaw).getTime() : Infinity;
    const bDate = b.dateRaw ? new Date(b.dateRaw).getTime() : Infinity;
    return aDate - bDate;
  });
  else filtered.sort((a, b) => a.distance - b.distance);

  if (authLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow border border-stone-100 overflow-hidden">
            <div className="h-44 bg-stone-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-stone-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: "50vh" }}>
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-lime-100 rounded-full flex items-center justify-center mb-5">
          <span className="text-4xl">🏷️</span>
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2 font-display">
          {sales.length === 0 ? "No Sales Posted Yet" : "No Sales Nearby"}
        </h3>
        <p className="text-stone-500 text-sm mb-1 max-w-[260px]">
          {sales.length === 0 ? "Be the first to post a yard sale in your area!" : "Try expanding your distance filter or check back later."}
        </p>
        <p className="text-stone-400 text-xs">Tap the <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>+</span> button below to get started.</p>
        {sales.length > 0 && (
          <div className="mt-6 px-4 py-2 bg-stone-50 rounded-xl text-xs text-stone-500">
            {sales.length} sale{sales.length !== 1 ? "s" : ""} exist but outside your {distLabel(dist, unit)} range ↑
          </div>
        )}
      </div>
    );
  }

  // Separate into active now vs upcoming
  const now = Date.now();
  const activeNow = filtered.filter(s => !s.dateRaw || new Date(s.dateRaw).getTime() <= now + 86400000);
  const upcoming = filtered.filter(s => s.dateRaw && new Date(s.dateRaw).getTime() > now + 86400000);

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
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
      </div>

      {/* Active sales */}
      {activeNow.map((s, i) => <SaleCard key={s.id} sale={s} delay={i * 0.04} />)}

      {/* Upcoming section */}
      {upcoming.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Coming Up</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>
          {upcoming.map((s, i) => <SaleCard key={s.id} sale={s} delay={(activeNow.length + i) * 0.04} />)}
        </>
      )}
    </div>
  );
}
