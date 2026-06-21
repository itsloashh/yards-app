"use client";
import { Loader2, BarChart3, Globe2, Users, Tag } from "lucide-react";
import { useAdminUsers, computeRegionStats, computeCountryStats } from "@/lib/admin";

export default function AdminRegionsPage() {
  const { users, loading } = useAdminUsers();

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  const regionStats = computeRegionStats(users).filter(r => r.region !== "Unknown");
  const countryStats = computeCountryStats(users).filter(c => c.country !== "Unknown");
  const maxRegionUsers = Math.max(1, ...regionStats.map(r => r.users));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Regions</h1>
        <p className="text-stone-400 text-sm mt-1">Where your community is growing — use this to prioritize expansion.</p>
      </div>

      {/* Country breakdown */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Globe2 className="w-5 h-5 text-emerald-400" /> By Country</h2>
        {countryStats.length === 0 ? (
          <p className="text-stone-500 text-sm">No country data yet.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {countryStats.map((c) => (
              <div key={c.country} className="bg-stone-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-stone-300 text-sm truncate">{c.country}</span>
                <span className="text-white font-bold">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Region detail table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-400" /> By Region / State</h2>
        {regionStats.length === 0 ? (
          <p className="text-stone-500 text-sm">No region data yet.</p>
        ) : (
          <div className="space-y-3">
            {regionStats.map((r) => (
              <div key={`${r.region}-${r.country}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-stone-200 font-medium truncate">{r.region}</span>
                    <span className="text-stone-500 text-xs truncate">{r.country}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <span className="text-stone-400 flex items-center gap-1"><Users className="w-3 h-3" />{r.users}</span>
                    <span className="text-emerald-400 flex items-center gap-1"><Tag className="w-3 h-3" />{r.sellers}</span>
                  </div>
                </div>
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full" style={{ width: `${(r.users / maxRegionUsers) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-800 text-xs text-stone-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Total users</span>
          <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-emerald-400" /> Active sellers</span>
        </div>
      </div>
    </div>
  );
}
