"use client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Mail, Calendar, Tag, Eye, Rocket, Flag, ShieldCheck, DollarSign, ExternalLink } from "lucide-react";
import { useAdminUserDetail } from "@/lib/admin";
import { reasonLabel } from "@/lib/reportReasons";
import { getPackage } from "@/lib/boostPackages";

function money(cents) { return `$${((cents || 0) / 100).toFixed(2)}`; }

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, sales, boosts, reports, loading } = useAdminUserDetail(id);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push("/admin/users")} className="text-stone-400 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft className="w-4 h-4" /> Back to Users</button>
        <p className="text-stone-400">User not found.</p>
      </div>
    );
  }

  const now = Date.now();
  const activeSales = sales.filter(s => !s.expires_at || new Date(s.expires_at).getTime() > now);
  const totalViews = sales.reduce((sum, s) => sum + (s.view_count || 0), 0);
  const paidBoosts = boosts.filter(b => b.status === "active" || b.status === "expired");
  const totalSpent = paidBoosts.reduce((sum, b) => sum + (b.amount_cents || 0), 0);
  const openReports = reports.filter(r => r.status === "open");

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/admin/users")} className="text-stone-400 hover:text-white flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Profile header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-white text-2xl font-bold" style={{ background: user.avatar_color || "#059669" }}>
            {(user.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{user.name || "Unnamed"}</h1>
              {user.role === "admin" && <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin</span>}
              {openReports.length > 0 && <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 text-xs font-bold rounded-full flex items-center gap-1"><Flag className="w-3 h-3" /> {openReports.length} open report{openReports.length !== 1 ? "s" : ""}</span>}
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-stone-400 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {user.email}</p>
              {user.location && <p className="text-stone-400 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {user.location}</p>}
              <p className="text-stone-500 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            {user.bio && <p className="text-stone-400 text-sm mt-3 italic border-t border-stone-800 pt-3">"{user.bio}"</p>}
            {user.phone && <p className="text-stone-500 text-xs mt-2">📞 {user.phone}</p>}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox icon={Tag} label="Total Sales" value={sales.length} sub={`${activeSales.length} active`} />
        <StatBox icon={Eye} label="Total Views" value={totalViews.toLocaleString()} />
        <StatBox icon={Rocket} label="Boosts Bought" value={paidBoosts.length} />
        <StatBox icon={DollarSign} label="Total Spent" value={money(totalSpent)} />
      </div>

      {/* Sales */}
      <Section title={`Sales (${sales.length})`}>
        {sales.length === 0 ? <Empty text="No sales posted." /> : (
          <div className="divide-y divide-stone-800/60">
            {sales.map((s) => {
              const isActive = !s.expires_at || new Date(s.expires_at).getTime() > now;
              const boosted = s.boosted_until && new Date(s.boosted_until).getTime() > now;
              return (
                <a key={s.id} href={`/sale/${s.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-stone-800/40 transition">
                  {s.photos?.[0] ? <img src={s.photos[0]} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">🏷️</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-100 text-sm font-medium truncate flex items-center gap-1.5">
                      {s.title}
                      {boosted && <span className="text-amber-400 text-xs">★</span>}
                    </p>
                    <p className="text-stone-500 text-xs truncate">{s.city || s.address || "No location"} · {(s.view_count || 0)} views</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-stone-700/50 text-stone-400"}`}>{isActive ? "Active" : "Ended"}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </Section>

      {/* Boosts / purchases */}
      <Section title={`Purchases (${paidBoosts.length})`}>
        {paidBoosts.length === 0 ? <Empty text="No boosts purchased." /> : (
          <div className="divide-y divide-stone-800/60">
            {boosts.map((b) => {
              const pkg = getPackage(b.package_id);
              return (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-stone-200 text-sm">{pkg?.name || b.package_id}</p>
                    <p className="text-stone-500 text-xs">{new Date(b.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-stone-200 text-sm font-medium">{money(b.amount_cents)}</p>
                    <p className={`text-xs ${b.status === "active" ? "text-emerald-400" : b.status === "pending" ? "text-amber-400" : "text-stone-500"}`}>{b.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Reports involving this user */}
      {reports.length > 0 && (
        <Section title={`Reports against this user (${reports.length})`}>
          <div className="divide-y divide-stone-800/60">
            {reports.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 text-xs font-bold rounded-full">{reasonLabel(r.reason)}</span>
                  <span className="text-stone-500 text-xs">{r.status}</span>
                </div>
                {r.details && <p className="text-stone-400 text-xs mt-1.5">"{r.details}"</p>}
                <p className="text-stone-600 text-[11px] mt-1">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
      <Icon className="w-4 h-4 text-emerald-400 mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-stone-400 text-xs">{label}</p>
      {sub && <p className="text-stone-500 text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-800">
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-stone-500 text-sm px-4 py-6 text-center">{text}</p>;
}
