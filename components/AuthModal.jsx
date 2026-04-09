"use client";
import { useState } from "react";
import { X, UserCircle, Mail, Lock, Eye, AlertCircle, Loader2 } from "lucide-react";
import { useApp } from "@/lib/AppContext";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthModal() {
  const { showAuth, setShowAuth, authMode, setAuthMode, handleSignUp, handleLogin, handleGoogleLogin } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errs, setErrs] = useState({});
  const [globalErr, setGlobalErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!showAuth) return null;

  const reset = () => {
    setErrs({}); setGlobalErr(""); setName(""); setEmail(""); setPw(""); setPw2("");
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
      if (result.error) setGlobalErr(result.error);
    } else {
      if (!email.trim()) e.email = "Email required";
      if (!pw) e.pw = "Password required";
      setErrs(e);
      if (Object.keys(e).length) return;
      setLoading(true);
      const result = await handleLogin(email.trim().toLowerCase(), pw);
      setLoading(false);
      if (result.error) setGlobalErr(result.error);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    const result = await handleGoogleLogin();
    setLoading(false);
    if (result?.error) setGlobalErr(result.error);
  };

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
          <button onClick={() => setShowAuth(false)} className="p-2 hover:bg-stone-100 rounded-full">
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>

        {globalErr && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />{globalErr}
          </div>
        )}

        {/* Google Login Button */}
        <button onClick={googleLogin} disabled={loading}
          className="w-full py-3.5 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-700 text-sm flex items-center justify-center gap-3 hover:bg-stone-50 hover:border-stone-300 transition mb-4 disabled:opacity-70">
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-stone-400">or use email</span></div>
        </div>

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
