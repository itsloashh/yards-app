"use client";
import { WifiOff } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { distLabel } from "@/lib/distance";
import { useFilteredSales } from "@/lib/useFilteredSales";
import { isBoosted } from "@/lib/boostPackages";
import SaleCard from "@/components/SaleCard";
import PromoBanner from "@/components/PromoBanner";

export default function HomePage() {
  const { dist, unit, sortBy, setSortBy, authLoading, salesLoading, sales, connOk, setSearch, setCategory, setWhen } = useApp();
  const { active, upcoming, inRange, filtersOn } = useFilteredSales();

  const showAll = !isFinite(dist); // "Anywhere" selected
  const clearFilters = () => { setSearch(""); setCategory(null); setWhen(null); };

  let activeFiltered = [...active];
  let upcomingFiltered = [...upcoming];

  if (sortBy === "newest") activeFiltered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else if (sortBy === "ending") activeFiltered.sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity));
  else activeFiltered.sort((a, b) => a.distance - b.distance);

  // Boosted sales always rank first (within the chosen sort), newest-boost first
  const boostRank = (s) => isBoosted(s.boostedUntil) ? new Date(s.boostedUntil).getTime() : 0;
  activeFiltered.sort((a, b) => boostRank(b) - boostRank(a));

  upcomingFiltered.sort((a, b) => {
    const aDate = a.dateRaw ? new Date(a.dateRaw).getTime() : Infinity;
    const bDate = b.dateRaw ? new Date(b.dateRaw).getTime() : Infinity;
    return aDate - bDate;
  });

  const totalVisible = activeFiltered.length + upcomingFiltered.length;

  // Connection banner — shows only when we know the connection is unhealthy
  const ConnectionBanner = () => (
    connOk === false ? (
      <div className="mx-4 mt-4 mb-1 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
        <WifiOff className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-800 text-xs font-semibold">We're having trouble loading sales</p>
          <p className="text-amber-600 text-[11px] mt-0.5">Please try again in a moment — we'll keep retrying.</p>
        </div>
      </div>
    ) : null
  );

  if (authLoading || salesLoading) {
    return (
      <div>
        <ConnectionBanner />
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
      </div>
    );
  }

  // Sales exist in range, but the search / category / quick filter hides them all
  if (!totalVisible && filtersOn && inRange > 0) {
    return (
      <div>
        <ConnectionBanner />
        <div className="flex flex-col items-center justify-center p-10 text-center" style={{ minHeight: "50vh" }}>
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-lime-100 rounded-full flex items-center justify-center mb-5">
            <span className="text-4xl" aria-hidden="true">🔎</span>
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2 font-display">No Matches</h3>
          <p className="text-stone-500 text-sm mb-5 max-w-[260px]">
            Nothing nearby matches your search and filters right now.
          </p>
          <button onClick={clearFilters}
            className="px-6 py-3 text-white font-bold rounded-xl shadow-lg text-sm"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            Clear search &amp; filters
          </button>
          <p className="mt-4 text-xs text-stone-400">{inRange} sale{inRange !== 1 ? "s" : ""} in your {distLabel(dist, unit)} range</p>
        </div>
      </div>
    );
  }

  if (!totalVisible) {
    return (
      <div>
        <ConnectionBanner />
        <PromoBanner />
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
          {sales.length > 0 && isFinite(dist) && (
            <div className="mt-6 px-4 py-2 bg-stone-50 rounded-xl text-xs text-stone-500">
              {sales.length} sale{sales.length !== 1 ? "s" : ""} exist but outside your {distLabel(dist, unit)} range ↑
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <ConnectionBanner />
      <PromoBanner />
      <div className="p-4 space-y-3 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800 font-display">{showAll ? "All Sales" : "Nearby Sales"}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-stone-400">{totalVisible} found</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="text-[12px] text-stone-600 bg-stone-100 rounded-lg px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer">
              <option value="distance">Nearest</option>
              <option value="newest">Newest</option>
              <option value="ending">Ending Soon</option>
            </select>
          </div>
        </div>

        {/* Active sales */}
        {activeFiltered.map((s, i) => <SaleCard key={s.id} sale={s} delay={i * 0.04} />)}

        {/* Upcoming section */}
        {upcomingFiltered.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-4">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Coming Up</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
            {upcomingFiltered.map((s, i) => <SaleCard key={s.id} sale={s} delay={(activeFiltered.length + i) * 0.04} />)}
          </>
        )}
      </div>
    </div>
  );
}
