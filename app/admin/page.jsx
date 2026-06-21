"use client";
import { Users, Globe2, Tag, TrendingUp, Eye, MapPin, Loader2 } from "lucide-react";
import { useAdminUsers, useAdminSales, computeCountryStats } from "@/lib/admin";

function StatCard({ icon: Icon, label, value, sub, accent = "emerald" }) {
  const accents = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
  };
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} border flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-stone-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const { users, loading: usersLoading } = useAdminUsers();
  const { sales, loading: salesLoading } = useAdminSales();

  if (usersLoading || salesLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const now = Date.now();
  const activeSales = sales.filter(s => !s.expires_at || new Date(s.expires_at).getTime() > now);
  const totalViews = sales.reduce((sum, s) => sum + (s.view_count || 0), 0);
  const sellers = users.filter(u => (u.sales_posted || 0) > 0).length;
  const withLocation = users.filter(u => u.location_lat && u.location_lng).length;
  const countries = computeCountryStats(users).filter(c => c.country !== "Unknown");

  // Signups in last 7 / 30 days
  const day = 86400000;
  const last7 = users.filter(u => now - new Date(u.created_at).getTime() < 7 * day).length;
  const last30 = users.filter(u => now - new Date(u.created_at).getTime() < 30 * day).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-stone-400 text-sm mt-1">Your Yard$ command center — users, reach, and activity at a glance.</p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={users.length.toLocaleString()} sub={`+${last7} this week`} accent="emerald" />
        <StatCard icon={Tag} label="Active Sales" value={activeSales.length.toLocaleString()} sub={`${sales.length} all-time`} accent="blue" />
        <StatCard icon={Globe2} label="Countries" value={countries.length.toLocaleString()} sub="with signups" accent="purple" />
        <StatCard icon={Eye} label="Total Ad Views" value={totalViews.toLocaleString()} sub="across all sales" accent="amber" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="New (30 days)" value={last30.toLocaleString()} accent="emerald" />
        <StatCard icon={Tag} label="Active Sellers" value={sellers.toLocaleString()} sub={`${users.length ? Math.round(sellers / users.length * 100) : 0}% of users`} accent="blue" />
        <StatCard icon={MapPin} label="Geo-located" value={withLocation.toLocaleString()} sub={`${users.length ? Math.round(withLocation / users.length * 100) : 0}% pinned`} accent="purple" />
        <StatCard icon={Eye} label="Avg Views/Sale" value={sales.length ? Math.round(totalViews / sales.length).toLocaleString() : "0"} accent="amber" />
      </div>

      {/* Top countries */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-emerald-400" /> Top Regions by Signups
        </h2>
        {countries.length === 0 ? (
          <p className="text-stone-500 text-sm">No location data yet.</p>
        ) : (
          <div className="space-y-3">
            {countries.slice(0, 8).map((c, i) => {
              const pct = users.length ? (c.count / users.length) * 100 : 0;
              return (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-stone-500 text-xs w-4">{i + 1}</span>
                  <span className="text-stone-300 text-sm w-32 truncate">{c.country}</span>
                  <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-stone-400 text-sm w-10 text-right">{c.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
