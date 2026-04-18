"use client";
import { useState } from "react";
import { X, UserCircle, Mail, Lock, Eye, AlertCircle, Loader2, MailCheck } from "lucide-react";
import { useApp } from "@/lib/AppContext";

export default function AuthModal() {
  const { showAuth, setShowAuth, authMode, setAuthMode, handleSignUp, handleLogin } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errs, setErrs] = useState({});
  const [globalErr, setGlobalErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  if (!showAuth) return null;

  const closeAndReset = () => {
    setShowAuth(false);
    setTimeout(() => {
      setErrs({}); setGlobalErr(""); setName(""); setEmail(""); setPw(""); setPw2("");
      setConfirmSent(false); setConfirmEmail("");
    }, 200);
  };

  const reset = () => {
    setErrs({}); setGlobalErr(""); setName(""); setEmail(""); setPw(""); setPw2("");
    setConfirmSent(false); setConfirmEmail("");
    setAuthMode(authMode === "login" ? "signup" : "login");
  };

  const submit = async () => {
    setGlobalErr("");
    const e = {};
    if (authMode === "signup") {
      if (!name.trim()) e.name = "Name is required";
      if (!email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
      if (!pw || pw.length < 8) e.pw = "At least 8 characters";
      if (pw !== pw2) e.pw2 = "Passwords don't match";
      setErrs(e);
      if (Object.keys(e).length) return;
      setLoading(true);
      const result = await handleSignUp(name.trim(), email.trim().toLowerCase(), pw);
      setLoading(false);
      if (result.error) {
        setGlobalErr(result.error);
      } else {
        // Show confirmation screen
        setConfirmEmail(email.trim().toLowerCase());
        setConfirmSent(true);
      }
    } else {
      if (!email.trim()) e.email = "Email required";
      if (!pw) e.pw = "Password required";
      setErrs(e);
      if (Object.keys(e).length) return;
      setLoading(true);
      const result = await handleLogin(email.trim().toLowerCase(), pw);
      setLoading(false);
      if (result.error) {
        // Friendlier message for unconfirmed email
        if (result.error.toLowerCase().includes("email not confirmed") ||
            result.error.toLowerCase().includes("not confirmed")) {
          setGlobalErr("Please confirm your email first. Check your inbox for the confirmation link.");
        } else {
          setGlobalErr(result.error);
        }
      }
    }
  };

  // Confirmation sent screen
  if (confirmSent) {
    return (
      <div className="absolute inset-0 bg-black/50 z-[300] flex items-end animate-fade-in">
        <div className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-stone-800 font-display">Check Your Email</h2>
            <button onClick={closeAndReset} className="p-2 hover:bg-stone-100 rounded-full">
              <X className="w-6 h-6 text-stone-500" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)" }}>
              <MailCheck className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2 font-display">Confirm your email to finish</h3>
            <p className="text-stone-600 text-sm mb-1">We sent a confirmation link to</p>
            <p className="text-emerald-700 font-semibold text-sm mb-4 break-all">{confirmEmail}</p>
            <p className="text-stone-500 text-xs max-w-[280px] leading-relaxed">
              Click the link in the email to activate your account, then come back here and sign in.
            </p>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-xs leading-relaxed">
              <span className="font-semibold">Didn't get it?</span> Check your spam folder. The link expires in 24 hours.
            </p>
          </div>

          <button onClick={() => { setConfirmSent(false); setAuthMode("login"); setPw(""); setPw2(""); }}
            className="w-full mt-5 py-3.5 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition text-sm"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            Go to Sign In
          </button>

          <button onClick={closeAndReset} className="w-full mt-2 py-2.5 text-stone-500 font-medium text-sm hover:text-stone-700 transition">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-[300] flex items-end animate-fade-in">
      <div className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-stone-800 font-display">
              {authMode === "login" ? "Welcome Back!" : "Join Yard$"}
            </h2>
            <p className="text-stone-500 text-sm mt-0.5">
              {authMode === "login" ? "Sign in to your account" : "Create an account to buy and sell locally"}
            </p>
          </div>
          <button onClick={closeAndReset} className="p-2 hover:bg-stone-100 rounded-full">
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>

        {globalErr && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span>{globalErr}</span>
          </div>
        )}

        <div className="space-y-4">
          {authMode === "signup" && (
            <Field icon={UserCircle} label="Full Name" value={name} onChange={setName} err={errs.name} placeholder="Your name" />
          )}
          <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} err={errs.email} placeholder="you@example.com" />
          <Field icon={Lock} label="Password" type={showPw ? "text" : "password"} value={pw} onChange={setPw} err={errs.pw}
            placeholder={authMode === "signup" ? "At least 8 characters" : "Your password"}
            right={<button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><Eye className="w-5 h-5" /></button>} />
          {authMode === "signup" && (
            <Field icon={Lock} label="Confirm Password" type={showPw ? "text" : "password"} value={pw2} onChange={setPw2} err={errs.pw2} placeholder="Confirm password" />
          )}

          <button onClick={submit} disabled={loading}
            className="w-full py-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Please wait…" : authMode === "login" ? "Sign In" : "Create Account"}
          </button>

          {authMode === "signup" && (
            <p className="text-center text-stone-400 text-[11px] leading-relaxed px-2">
              We'll email you a confirmation link to verify your account.
            </p>
          )}
        </div>

        <p className="text-center text-stone-600 text-sm mt-5">
          {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={reset} className="text-emerald-600 font-semibold hover:underline">
            {authMode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, type = "text", value, onChange, err, placeholder, right }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 ${right ? "pr-12" : "pr-4"} py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${err ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
        {right}
      </div>
      {err && <p className="text-rose-500 text-xs mt-1">{err}</p>}
    </div>
  );
}
