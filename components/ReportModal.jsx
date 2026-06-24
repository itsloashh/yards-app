"use client";
import { useState } from "react";
import { X, Flag, Check, Loader2, AlertCircle } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { SALE_REPORT_REASONS, USER_REPORT_REASONS } from "@/lib/reportReasons";

// targetType: "sale" | "user"
export default function ReportModal({ targetType, sale, targetUserId, targetName, onClose }) {
  const { submitReport, user, setShowAuth } = useApp();
  const reasons = targetType === "sale" ? SALE_REPORT_REASONS : USER_REPORT_REASONS;
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!reason) { setError("Please pick a reason."); return; }
    setLoading(true);
    setError("");
    const res = await submitReport({
      targetType,
      saleId: sale?.id,
      targetUserId: targetType === "user" ? targetUserId : (sale?.userId || null),
      reason,
      details: details.trim(),
    });
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[750] flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 bg-stone-800 text-white shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-lg font-bold flex items-center gap-2"><Flag className="w-5 h-5" /> {done ? "Report Submitted" : `Report ${targetType === "sale" ? "this sale" : targetName || "user"}`}</h2>
          {!done && <p className="text-white/70 text-sm mt-0.5">Help keep Yard$ safe. Reports are private.</p>}
        </div>

        {done ? (
          <div className="px-6 py-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-bold text-stone-800 mb-1.5">Thanks for letting us know</h3>
            <p className="text-stone-500 text-sm mb-6 max-w-xs">Our team will review this report and take action if needed. You won't be notified, but we appreciate you helping keep the community safe.</p>
            <button onClick={onClose} className="px-8 py-3 text-white font-bold rounded-xl shadow transition" style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>Done</button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <p className="text-stone-600 text-sm font-medium mb-3">What's wrong?</p>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <button key={r.key} onClick={() => { setReason(r.key); setError(""); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition flex items-center gap-3 ${reason === r.key ? "border-stone-800 bg-stone-50" : "border-stone-200 hover:border-stone-300"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${reason === r.key ? "border-stone-800 bg-stone-800" : "border-stone-300"}`}>
                      {reason === r.key && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-stone-700">{r.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-stone-600 text-sm font-medium mt-4 mb-2">Anything else? <span className="text-stone-400 font-normal">(optional)</span></p>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={500}
                placeholder="Add any details that would help us review this…"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 text-sm resize-none" />

              {error && <p className="text-rose-600 text-xs mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
            </div>

            <div className="px-5 pb-6 pt-2 border-t border-stone-100 shrink-0">
              <button onClick={submit} disabled={loading}
                className="w-full py-3.5 bg-stone-800 text-white font-bold rounded-xl shadow hover:bg-stone-900 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flag className="w-4 h-4" />}
                {loading ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
