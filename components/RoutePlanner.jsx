"use client";
import { useState, useMemo } from "react";
import { X, Map as RouteIcon, MapPin, Check, Navigation, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { orderRoute, routeDistanceKm, googleMapsUrl, appleMapsUrl, isAppleDevice, MAX_ROUTE_STOPS } from "@/lib/routePlanner";

export default function RoutePlanner({ savedSales, startLoc, unit, onClose }) {
  // Default: all saved sales selected
  const [selected, setSelected] = useState(() => new Set(savedSales.map((s) => s.id)));
  const appleFirst = isAppleDevice();

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(savedSales.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const chosen = savedSales.filter((s) => selected.has(s.id) && s.coords);

  // Order the route + handle the stop cap
  const { ordered, capped, distKm } = useMemo(() => {
    const all = orderRoute(startLoc, chosen);
    const capped = all.length > MAX_ROUTE_STOPS;
    const ordered = all.slice(0, MAX_ROUTE_STOPS);
    const distKm = routeDistanceKm(startLoc, ordered);
    return { ordered, capped, distKm };
  }, [chosen, startLoc]);

  const useMi = unit !== "km";
  const distLabel = useMi ? `${(distKm * 0.621371).toFixed(1)} mi` : `${distKm.toFixed(1)} km`;

  const openGoogle = () => {
    const url = googleMapsUrl(startLoc, ordered);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };
  const openApple = () => {
    const url = appleMapsUrl(startLoc, ordered);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 text-white shrink-0" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-xl font-bold font-display flex items-center gap-2"><RouteIcon className="w-5 h-5" /> Plan Your Route</h2>
          <p className="text-white/85 text-sm mt-0.5">Pick your stops — we'll order them efficiently</p>
        </div>

        {/* Select controls */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
          <span className="text-stone-500 text-sm">{chosen.length} of {savedSales.length} selected</span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-emerald-600 text-xs font-semibold hover:underline">Select all</button>
            <span className="text-stone-300">·</span>
            <button onClick={clearAll} className="text-stone-500 text-xs font-semibold hover:underline">Clear</button>
          </div>
        </div>

        {/* Sale selection list */}
        <div className="px-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            {savedSales.map((s) => {
              const isSel = selected.has(s.id);
              const orderIdx = ordered.findIndex((o) => o.id === s.id);
              return (
                <button key={s.id} onClick={() => toggle(s.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3 ${isSel ? "border-emerald-400 bg-emerald-50" : "border-stone-200 hover:border-stone-300"}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${isSel ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 text-transparent"}`}>
                    {isSel && orderIdx >= 0 && orderIdx < MAX_ROUTE_STOPS ? orderIdx + 1 : isSel ? <Check className="w-3 h-3" /> : ""}
                  </div>
                  {s.photos?.[0] ? (
                    <img src={s.photos[0]} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">🏷️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{s.title}</p>
                    <p className="text-stone-500 text-xs truncate">{s.distanceText ? `${s.distanceText} · ` : ""}{s.address || s.city || ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-stone-100 shrink-0">
          {capped && (
            <p className="text-amber-700 text-xs flex items-center gap-1.5 mb-2.5 bg-amber-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Maps supports up to {MAX_ROUTE_STOPS} stops — using your {MAX_ROUTE_STOPS} closest selected.
            </p>
          )}
          {ordered.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-2 text-stone-500 text-xs mb-3">
                <MapPin className="w-3.5 h-3.5" /> {ordered.length} stop{ordered.length !== 1 ? "s" : ""} · ~{distLabel} total
              </div>
              <div className="flex flex-col gap-2">
                {/* Show the device-likely option first */}
                {appleFirst ? (
                  <>
                    <button onClick={openApple} className="w-full py-3.5 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
                      <Navigation className="w-4 h-4" /> Open in Apple Maps
                    </button>
                    <button onClick={openGoogle} className="w-full py-3 bg-white border-2 border-stone-200 text-stone-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 transition">
                      <Navigation className="w-4 h-4" /> Open in Google Maps
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={openGoogle} className="w-full py-3.5 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
                      <Navigation className="w-4 h-4" /> Open in Google Maps
                    </button>
                    <button onClick={openApple} className="w-full py-3 bg-white border-2 border-stone-200 text-stone-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 transition">
                      <Navigation className="w-4 h-4" /> Open in Apple Maps
                    </button>
                  </>
                )}
              </div>
              <p className="text-center text-stone-400 text-[11px] mt-2.5">Turn-by-turn directions open in your maps app.</p>
            </>
          ) : (
            <p className="text-center text-stone-400 text-sm py-2">Select at least one sale to build a route.</p>
          )}
        </div>
      </div>
    </div>
  );
}
