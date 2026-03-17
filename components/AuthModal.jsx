"use client";
import { useState } from "react";
import { X, UserCircle, Mail, Lock, Eye, AlertCircle } from "lucide-react";
import { useApp } from "@/lib/AppContext";

export default function AuthModal() {
  const { showAuth, setShowAuth, authMode, setAuthMode, handleSignUp, handleLogin, users } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errs, setErrs] = useState({});
  const [loginErr, setLoginErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  if (!showAuth) return null;

  const reset = () => {
    setErrs({});
    setLoginErr("");
    setName("");
    setEmail("");
    setPw("");
    setPw2("");
    setAuthMode(authMode === "login" ? "signup" : "login");
  };

  const submit = () => {
    setLoginErr("");
    const newErrs = {};

    if (authMode === "signup") {
      if (!name.trim()) newErrs.name = "Name is required";
      if (!email.trim()) newErrs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrs.email = "Invalid email";
      else if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) newErrs.email = "Account already exists";
      if (!pw || pw.length < 8) newErrs.pw = "At least 8 characters";
      if (pw !== pw2) newErrs.pw2 = "Passwords don't match";
      setErrs(newErrs);
      if (!Object.keys(newErrs).length) {
        handleSignUp({ name: name.trim(), email: email.trim().toLowerCase(), password: pw });
      }
    } else {
      if (!email.trim()) newErrs.email = "Email required";
      if (!pw) newErrs.pw = "Password required";
      setErrs(newErrs);
      if (!Object.keys(newErrs).length && !handleLogin(email.trim().toLowerCase(), pw)) {
        setLoginErr("Invalid email or password");
      }
    }
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

        {loginErr && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />{loginErr}
          </div>
        )}

        <div className="space-y-4">
          {authMode === "signup" && (
            <FieldGroup icon={UserCircle} label="Full Name" value={name} onChange={setName} err={errs.name} placeholder="Your name" />
          )}
          <FieldGroup icon={Mail} label="Email" type="email" value={email} onChange={setEmail} err={errs.email} placeholder="you@example.com" />
          <FieldGroup icon={Lock} label="Password" type={showPw ? "text" : "password"} value={pw} onChange={setPw} err={errs.pw}
            placeholder={authMode === "signup" ? "At least 8 characters" : "Your password"}
            right={<button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><Eye className="w-5 h-5" /></button>} />
          {authMode === "signup" && (
            <FieldGroup icon={Lock} label="Confirm Password" type={showPw ? "text" : "password"} value={pw2} onChange={setPw2} err={errs.pw2} placeholder="Confirm password" />
          )}

          <button onClick={submit}
            className="w-full py-4 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition text-sm"
            style={{ background: "linear-gradient(135deg, #059669, #84cc16)" }}>
            {authMode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-stone-500">or</span></div>
        </div>

        <p className="text-center text-stone-600 text-sm">
          {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={reset} className="text-yard-600 font-semibold hover:underline">
            {authMode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

function FieldGroup({ icon: Icon, label, type = "text", value, onChange, err, placeholder, right }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 ${right ? "pr-12" : "pr-4"} py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yard-500 text-sm ${err ? "border-rose-300 bg-rose-50" : "border-stone-200"}`} />
        {right}
      </div>
      {err && <p className="text-rose-500 text-xs mt-1">{err}</p>}
    </div>
  );
}
