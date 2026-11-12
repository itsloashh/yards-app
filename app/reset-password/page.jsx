"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Where the "reset your password" email link lands. The link signs the person
// in for this one purpose; they pick a new password here.
export default function ResetPasswordPage() {
  const router = useRouter();
  // "checking" | "ready" | "invalid" | "done"
  const [step, setStep] = useState("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let settled = false;
    const ready = () => { if (!settled) { settled = true; setStep("ready"); } };

    // The email link carries a one-time sign-in; Supabase picks it up from the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION"))) ready();
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) ready(); }).catch(() => {});

    // No sign-in after a few seconds = the link is expired, already used, or was opened directly
    const t = setTimeout(() => { if (!settled) { settled = true; setStep("invalid"); } }, 4000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const save = async () => {
    setErr("");
    if (!pw || pw.length < 8) { setErr("Use at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords don't match."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { setErr(error.message); setSaving(false); return; }
      setStep("done");
    } catch {
      setErr("We're having trouble connecting right now — please try again in a moment.");
    }
    setSaving(false);
  };

  const btn = "w-full py-4 text-white font-bold rounded-xl shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-70";
  const btnStyle = { background: "linear-gradient(135deg, #059669, #84cc16)" };

  return (
    <div className="p-6">
      {step === "checking" && (
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "40vh" }} role="status">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-stone-500 text-sm">Checking your reset link…</p>
        </div>
      )}

      {step === "invalid" && (
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "40vh" }}>
          <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-stone-800 mb-2 font-display">This link has expired</h2>
          <p className="text-stone-500 text-sm mb-6 max-w-[280px]">
            Reset links only work once and expire after a while. Go back, tap Sign In, then &quot;Forgot password?&quot; to get a new one.
          </p>
          <button onClick={() => router.push("/")} className={btn} style={btnStyle}>Back to Yard$</button>
        </div>
      )}

      {step === "ready" && (
        <div>
          <h2 className="text-2xl font-bold text-stone-800 font-display">Set a New Password</h2>
          <p className="text-stone-500 text-sm mt-1 mb-5">Choose a new password for your Yard$ account.</p>

          {err && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm" role="alert">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{err}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium text-stone-700 mb-1">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input id="new-pw" type={showPw ? "text" : "password"} autoComplete="new-password" value={pw}
                  onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters"
                  className="w-full pl-10 pr-12 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-600">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="new-pw2" className="block text-sm font-medium text-stone-700 mb-1">Confirm new password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input id="new-pw2" type={showPw ? "text" : "password"} autoComplete="new-password" value={pw2}
                  onChange={(e) => setPw2(e.target.value)} placeholder="Type it again"
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              </div>
            </div>
            <button onClick={save} disabled={saving} className={btn} style={btnStyle}>
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              {saving ? "Saving…" : "Save new password"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "40vh" }}>
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <h2 className="text-xl font-bold text-stone-800 mb-2 font-display">Password updated</h2>
          <p className="text-stone-500 text-sm mb-6">You&apos;re signed in with your new password.</p>
          <button onClick={() => router.push("/")} className={btn} style={btnStyle}>Browse sales</button>
        </div>
      )}
    </div>
  );
}
