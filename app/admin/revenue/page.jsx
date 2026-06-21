"use client";
import { Loader2, DollarSign, Rocket, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { useAdminBoosts } from "@/lib/admin";
import { getPackage } from "@/lib/boostPackages";

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminRevenuePage() {
  const { boosts, loading } = useAdminBoosts();

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  // Only count paid (active or expired) boosts as revenue — not pending/failed
  const paid = boosts.filter(b => b.status === "active" || b.status === "expired");
  const totalRevenue = paid.reduce((sum, b) => sum + (b.amount_cents || 0), 0);
  const now = Date.now();
  const activeBoosts = boosts.filter(b => b.status === "active" && b.expires_at && new Date(b.expires_at).getTime() > now);

  const day = 86400000;
  const last30Revenue = paid
    .filter(b => now - new Date(b.created_at).getTime() < 30 * day)
    .reduce((sum, b) => sum + (b.amount_cents || 0), 0);

  // Revenue by package
  const byPackage = {};
  for (const b of paid) {
    const pkg = getPackage(b.package_id);
    const name = pkg?.name || b.package_id;
    if (!byPackage[name]) byPackage[name] = { name, count: 0, revenue: 0 };
    byPackage[name].count += 1;
    byPackage[name].revenue += b.amount_cents || 0;
  }
  const packageStats = Object.values(byPackage).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue & Boosts</h1>
        <p className="text-stone-400 text-sm mt-1">Ad-boost earnings and currently featured sales.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5" /></div>
          <p className="text-3xl font-bold text-white">{money(totalRevenue)}</p>
          <p className="text-stone-400 text-sm mt-0.5">Total Revenue</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5" /></div>
          <p className="text-3xl font-bold text-white">{money(last30Revenue)}</p>
          <p className="text-stone-400 text-sm mt-0.5">Last 30 Days</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3"><Rocket className="w-5 h-5" /></div>
          <p className="text-3xl font-bold text-white">{activeBoosts.length}</p>
          <p className="text-stone-400 text-sm mt-0.5">Active Boosts</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3"><CheckCircle2 className="w-5 h-5" /></div>
          <p className="text-3xl font-bold text-white">{paid.length}</p>
          <p className="text-stone-400 text-sm mt-0.5">Total Sales</p>
        </div>
      </div>

      {/* By package */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">Revenue by Package</h2>
        {packageStats.length === 0 ? (
          <p className="text-stone-500 text-sm">No purchases yet.</p>
        ) : (
          <div className="space-y-3">
            {packageStats.map((p) => (
              <div key={p.name} className="flex items-center justify-between bg-stone-800/40 rounded-xl px-4 py-3">
                <div>
                  <p className="text-stone-200 text-sm font-medium">{p.name}</p>
                  <p className="text-stone-500 text-xs">{p.count} sold</p>
                </div>
                <p className="text-emerald-400 font-bold">{money(p.revenue)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction log */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-800">
          <h2 className="text-white font-bold">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase tracking-wide">
                <th className="text-left font-medium px-5 py-3">Package</th>
                <th className="text-left font-medium px-5 py-3">Amount</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {boosts.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-stone-500">No transactions yet.</td></tr>
              ) : boosts.slice(0, 50).map((b) => {
                const pkg = getPackage(b.package_id);
                const statusColors = {
                  active: "bg-emerald-500/15 text-emerald-400",
                  expired: "bg-stone-700/50 text-stone-400",
                  pending: "bg-amber-500/15 text-amber-400",
                  failed: "bg-rose-500/15 text-rose-400",
                };
                return (
                  <tr key={b.id} className="border-b border-stone-800/50">
                    <td className="px-5 py-3 text-stone-200">{pkg?.name || b.package_id}</td>
                    <td className="px-5 py-3 text-stone-300 font-medium">{money(b.amount_cents)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] || "bg-stone-700/50 text-stone-400"}`}>{b.status}</span>
                    </td>
                    <td className="px-5 py-3 text-stone-400 text-xs hidden sm:table-cell">{new Date(b.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-stone-600 text-xs">Revenue reflects completed payments only. Pending = checkout started but not paid.</p>
    </div>
  );
}
