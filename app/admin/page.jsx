"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Globe2, Tag, TrendingUp, Eye, MapPin, Loader2, ChevronRight, ChevronDown, Clock } from "lucide-react";
import { useAdminUsers, useAdminSales, computeCountryStats } from "@/lib/admin";

function StatCard({ icon: Icon, label, value, sub, accent = "emerald", onClick, expandable, expanded }) {
  const accents = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left bg-stone-900 border rounded-2xl p-5 transition-all w-full ${
        onClick ? "hover:border-stone-700 hover:bg-stone-800/40 active:scale-[0.98] cursor-pointer" : "cursor-default"
      } ${expanded ? "border-emerald-500/40 bg-stone-800/30" : "border-stone-800"}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} border flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        {onClick && (
          expandable
            ? <ChevronDown className={`w-4 h-4 text-stone-600 transition-transform ${expanded ? "rotate-180 text-emerald-400" : ""}`} />
            : <ChevronRight className="w-4 h-4 text-stone-600" />
        )}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-stone-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </button>
  );
}

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m left`;
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

export default function AdminOverview() {
  const router = useRouter();
  const { users, loading: usersLoading } = useAdminUsers();
  const { sales, loading: salesLoading } = useAdminSales();
  const [expanded, setExpanded] = useState(null);

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
  const day = 86400000;
  const last7 = users.filter(u => now - new Date(u.created_at).getTime() < 7 * day).length;
  const last30 = users.filter(u => now - new Date(u.created_at).getTime() < 30 * day).length;

  const activeSorted = [...activeSales].sort((a, b) => {
    const ax = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
    const bx = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
    return ax - bx;
  });
  const topByViews = [...sales].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10);

  const toggle = (key) => setExpanded(prev => prev === key ? null : key);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-stone-400 text-sm mt-1">Your Yard$ command center — tap any card to dig in.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={users.length.toLocaleString()} sub={`+${last7} this week`} accent="emerald"
          onClick={() => router.push("/admin/users")} />
        <StatCard icon={Tag} label="Active Sales" value={activeSales.length.toLocaleString()} sub={`${sales.length} all-time`} accent="blue"
          expandable expanded={expanded === "active"} onClick={() => toggle("active")} />
        <StatCard icon={Globe2} label="Countries" value={countries.length.toLocaleString()} sub="with signups" accent="purple"
          onClick={() => router.push("/admin/regions")} />
        <StatCard icon={Eye} label="Total Ad Views" value={totalViews.toLocaleString()} sub="across all sales" accent="amber"
          expandable expanded={expanded === "views"} onClick={() => toggle("views")} />
      </div>

      {(expanded === "active" || expanded === "views") && (
        <InlinePanel
          title={expanded === "active" ? "Active Sales" : "Top Sales by Views"}
          onClose={() => setExpanded(null)}
        >
          {expanded === "active" ? (
            activeSorted.length === 0 ? (
              <p className="text-stone-500 text-sm py-4 text-center">No active sales right now.</p>
            ) : activeSorted.map(s => (
              <SaleRow key={s.id} sale={s} showTime />
            ))
          ) : (
            topByViews.length === 0 ? (
              <p className="text-stone-500 text-sm py-4 text-center">No sales yet.</p>
            ) : topByViews.map(s => (
              <SaleRow key={s.id} sale={s} showViews />
            ))
          )}
        </InlinePanel>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="New (30 days)" value={last30.toLocaleString()} accent="emerald"
          onClick={() => router.push("/admin/users")} />
        <StatCard icon={Tag} label="Active Sellers" value={sellers.toLocaleString()} sub={`${users.length ? Math.round(sellers / users.length * 100) : 0}% of users`} accent="blue"
          onClick={() => router.push("/admin/users?filter=sellers")} />
        <StatCard icon={MapPin} label="Geo-located" value={withLocation.toLocaleString()} sub={`${users.length ? Math.round(withLocation / users.length * 100) : 0}% pinned`} accent="purple"
          onClick={() => router.push("/admin/map")} />
        <StatCard icon={Eye} label="Avg Views/Sale" value={sales.length ? Math.round(totalViews / sales.length).toLocaleString() : "0"} accent="amber"
          expandable expanded={expanded === "avgviews"} onClick={() => toggle("avgviews")} />
      </div>

      {expanded === "avgviews" && (
        <InlinePanel title="Top Sales by Views" onClose={() => setExpanded(null)}>
          {topByViews.length === 0 ? (
            <p className="text-stone-500 text-sm py-4 text-center">No sales yet.</p>
          ) : topByViews.map(s => <SaleRow key={s.id} sale={s} showViews />)}
        </InlinePanel>
      )}

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

function InlinePanel({ title, children, onClose }) {
  return (
    <div className="bg-stone-900 border border-emerald-500/30 rounded-2xl overflow-hidden animate-drop-in">
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        <button onClick={onClose} className="text-stone-500 hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y divide-stone-800/60">
        {children}
      </div>
    </div>
  );
}

function SaleRow({ sale, showTime, showViews }) {
  const tl = timeLeft(sale.expires_at);
  return (
    <button
      onClick={() => window.open(`/sale/${sale.id}`, "_blank")}
      className="w-full text-left px-5 py-3 hover:bg-stone-800/40 transition flex items-center gap-3"
    >
      {sale.photos?.[0] ? (
        <img src={sale.photos[0]} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 text-lg">🏷️</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-stone-100 text-sm font-medium truncate">{sale.title}</p>
        <p className="text-stone-500 text-xs truncate flex items-center gap-1">
          <MapPin className="w-3 h-3" />{sale.address || "No address"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {showViews && (
          <span className="text-amber-400 text-sm font-semibold flex items-center gap-1 justify-end">
            <Eye className="w-3.5 h-3.5" />{(sale.view_count || 0).toLocaleString()}
          </span>
        )}
        {showTime && tl && (
          <span className={`text-xs font-semibold flex items-center gap-1 justify-end ${tl === "Ended" ? "text-stone-500" : "text-emerald-400"}`}>
            <Clock className="w-3 h-3" />{tl}
          </span>
        )}
        {showTime && (
          <span className="text-stone-500 text-[11px] flex items-center gap-1 justify-end mt-0.5">
            <Eye className="w-3 h-3" />{(sale.view_count || 0).toLocaleString()}
          </span>
        )}
      </div>
    </button>
  );
}
