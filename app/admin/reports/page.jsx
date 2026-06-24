"use client";
import { useState } from "react";
import { Loader2, Flag, Check, Trash2, X, ExternalLink, ShieldAlert, Inbox } from "lucide-react";
import { useAdminReports } from "@/lib/admin";
import { reasonLabel } from "@/lib/reportReasons";
import { supabase } from "@/lib/supabase";

export default function AdminReportsPage() {
  const { reports, loading, reload } = useAdminReports();
  const [filter, setFilter] = useState("open"); // open | all
  const [busy, setBusy] = useState(null);

  const visible = reports.filter((r) => filter === "all" ? true : r.status === "open");
  const openCount = reports.filter((r) => r.status === "open").length;

  const resolve = async (report, action) => {
    setBusy(report.id);
    try {
      // action: "dismiss" | "delete_sale"
      if (action === "delete_sale" && report.target_sale_id) {
        await supabase.from("sales").delete().eq("id", report.target_sale_id);
      }
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("reports").update({
        status: action === "delete_sale" ? "actioned" : "dismissed",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id || null,
      }).eq("id", report.id);
      await reload();
    } catch (err) {
      console.error("[resolve report] error:", err);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Reports
            {openCount > 0 && <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-sm rounded-full">{openCount} open</span>}
          </h1>
          <p className="text-stone-400 text-sm mt-1">Review flagged sales and take action to keep the community safe.</p>
        </div>
        <div className="flex gap-1.5 bg-stone-900 border border-stone-800 rounded-xl p-1">
          {["open", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? "bg-stone-700 text-white" : "text-stone-400 hover:text-white"}`}>
              {f === "open" ? "Open" : "All"}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-stone-800 flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-stone-500" />
          </div>
          <p className="text-stone-300 font-semibold">{filter === "open" ? "No open reports" : "No reports yet"}</p>
          <p className="text-stone-500 text-sm mt-1">{filter === "open" ? "You're all caught up." : "Reports from users will appear here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className={`bg-stone-900 border rounded-2xl overflow-hidden ${r.status === "open" ? "border-stone-800" : "border-stone-800/50 opacity-70"}`}>
              <div className="p-4 flex gap-4">
                {/* Reported sale thumbnail */}
                {r.sale?.photos?.[0] ? (
                  <img src={r.sale.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 text-2xl">🏷️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 text-xs font-bold rounded-full flex items-center gap-1">
                      <Flag className="w-3 h-3" /> {reasonLabel(r.reason)}
                    </span>
                    {r.status !== "open" && (
                      <span className="px-2 py-0.5 bg-stone-700/50 text-stone-400 text-xs rounded-full">{r.status}</span>
                    )}
                  </div>
                  <p className="text-stone-100 font-semibold text-sm mt-1.5 truncate">
                    {r.sale?.title || "(sale deleted)"}
                  </p>
                  {r.sale?.address && <p className="text-stone-500 text-xs truncate">📍 {r.sale.address}</p>}
                  {r.details && <p className="text-stone-400 text-xs mt-1.5 bg-stone-800/50 rounded-lg px-3 py-2">"{r.details}"</p>}
                  <p className="text-stone-600 text-[11px] mt-1.5">
                    Reported by {r.reporter?.name || "Unknown"} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {r.status === "open" && (
                <div className="px-4 pb-4 flex gap-2 flex-wrap">
                  {r.sale?.id && (
                    <a href={`/sale/${r.sale.id}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 bg-stone-800 text-stone-300 text-xs font-medium rounded-lg flex items-center gap-1.5 hover:bg-stone-700 transition">
                      <ExternalLink className="w-3.5 h-3.5" /> View sale
                    </a>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => resolve(r, "dismiss")} disabled={busy === r.id}
                    className="px-3 py-2 bg-stone-800 text-stone-300 text-xs font-medium rounded-lg flex items-center gap-1.5 hover:bg-stone-700 transition disabled:opacity-50">
                    {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Dismiss
                  </button>
                  {r.sale?.id && (
                    <button onClick={() => resolve(r, "delete_sale")} disabled={busy === r.id}
                      className="px-3 py-2 bg-rose-500/15 text-rose-400 text-xs font-medium rounded-lg flex items-center gap-1.5 hover:bg-rose-500/25 transition disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" /> Delete sale
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
