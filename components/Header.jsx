"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, MapPin, ChevronDown, Check, Filter, X, RefreshCw, AlertCircle, Crosshair, User } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { DIST_VALUES, CATEGORIES } from "@/lib/constants";
import { distLabel } from "@/lib/distance";

function YardLogo({ onClick }) {
  return (
    <button onClick={onClick} className="focus:outline-none hover:opacity-90 transition group">
      <div className="flex items-baseline gap-[1px]">
        <span className="text-[28px] font-black text-white tracking-tight drop-shadow-lg" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
          Yard
        </span>
        <span className="text-[30px] font-black tracking-tight drop-shadow-lg" style={{ fontFamily: "var(--font-display), Georgia, serif", color: "#bef264" }}>
          $
        </span>
      </div>
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loc, locName, locErr, locLoading, requestLocation, dist, setDist, unit, setUnit, setShowAuth } = useApp();
  const [query, setQuery] = useState("");
  const [distOpen, setDistOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catFilter, setCatFilter] = useState(null);

  const isDetail = pathname.startsWith("/sale/");

  return (
    <header className="relative px-4 pt-12 pb-4 z-[100] shrink-0" style={{ background: "linear-gradient(135deg, #065f46 0%, #059669 40%, #84cc16 100%)" }}>
      {/* Decorative blob */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-lime-400 opacity-[0.12]" />
        <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-emerald-300 opacity-[0.08]" />
      </div>

      <div className="relative z-10">
        {/* Top row: logo + location + avatar */}
        <div className="flex items-center justify-between mb-3">
          <YardLogo onClick={() => router.push("/")} />

          <div className="flex items-center gap-2">
            <button onClick={requestLocation}
              className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-white/15 backdrop-blur hover:bg-white/25 transition max-w-[150px]">
              {locLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                : locErr ? <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                : <Crosshair className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{locLoading ? "Locating…" : locName || "Get Location"}</span>
            </button>

            <button onClick={() => user ? router.push("/profile") : setShowAuth(true)}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition">
              {user
                ? <span className="text-white font-bold text-sm">{user.name.split(" ").map(n => n[0]).join("").toUpperCase()}</span>
                : <User className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {!isDetail && (
          <>
            <div className="relative mb-2.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-yard-600" />
              <input type="text" placeholder="Search yard sales near you…" value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white shadow-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400 text-sm font-body" />
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-2 relative">
              {/* Distance */}
              <button onClick={() => { setDistOpen(!distOpen); setCatOpen(false); }}
                className="flex items-center gap-1.5 px-3.5 py-[7px] bg-white/20 backdrop-blur rounded-full text-white text-[13px] font-semibold hover:bg-white/30 transition">
                <MapPin className="w-3.5 h-3.5" />
                {distLabel(dist, unit)}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${distOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Category */}
              <button onClick={() => { setCatOpen(!catOpen); setDistOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-[7px] backdrop-blur rounded-full text-[13px] font-semibold transition ${catFilter ? "bg-white text-yard-700" : "bg-white/20 text-white hover:bg-white/30"}`}>
                <Filter className="w-3.5 h-3.5" />
                {catFilter || "All"}
              </button>

              {catFilter && (
                <button onClick={() => setCatFilter(null)} className="px-2 py-1 bg-white/20 rounded-full">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}

              {/* Distance dropdown */}
              {distOpen && <>
                <div className="fixed inset-0 z-40" onClick={() => setDistOpen(false)} />
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[160px] border border-stone-100 z-50 animate-drop-in">
                  <div className="px-3 pt-3 pb-2 flex gap-1">
                    {["mi", "km"].map(u => (
                      <button key={u} onClick={() => setUnit(u)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${unit === u ? "bg-yard-600 text-white" : "bg-stone-100 text-stone-500"}`}>
                        {u === "mi" ? "Miles" : "Kilometers"}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-stone-100" />
                  {DIST_VALUES.map(o => (
                    <button key={o} onClick={() => { setDist(o); setDistOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center justify-between hover:bg-yard-50 transition ${dist === o ? "bg-yard-50 text-yard-600" : "text-stone-700"}`}>
                      {distLabel(o, unit)}
                      {dist === o && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>}

              {/* Category dropdown */}
              {catOpen && <>
                <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} />
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden w-[200px] max-h-[300px] overflow-y-auto border border-stone-100 z-50 animate-drop-in">
                  <button onClick={() => { setCatFilter(null); setCatOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-yard-50 transition ${!catFilter ? "bg-yard-50 text-yard-600" : "text-stone-700"}`}>
                    All Categories
                  </button>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setCatFilter(c); setCatOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-yard-50 transition ${catFilter === c ? "bg-yard-50 text-yard-600" : "text-stone-600"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </>}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
