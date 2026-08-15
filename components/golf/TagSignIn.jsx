"use client";
import { useState } from "react";
import { Loader2, Tag, ArrowRight } from "lucide-react";

export default function TagSignIn({ onSubmit, error }) {
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!tag.trim() || busy) return;
    setBusy(true);
    await onSubmit(tag.trim());
    setBusy(false);
  };

  return (
    <div className="px-6 py-10 max-w-sm mx-auto text-center">
      <img src="/golf-logo.png" alt="Yard$ Golf" className="w-48 max-w-[70%] h-auto mx-auto mb-6 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" />

      <div className="golf-card rounded-2xl p-6">
        <div className="w-12 h-12 rounded-xl bg-amber-50/95 flex items-center justify-center mx-auto mb-3">
          <Tag className="w-6 h-6" style={{ color: "#065f46" }} />
        </div>
        <h1 className="text-white font-bold font-display text-xl">Tournament Check-In</h1>
        <p className="text-amber-50/70 text-sm mt-1.5 leading-relaxed">
          Enter the number printed on your bag tag to load your card.
        </p>

        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric"
          autoComplete="off"
          placeholder="000"
          className="w-full mt-5 text-center text-3xl font-bold tracking-[0.3em] bg-emerald-950/70 border border-lime-200/25 rounded-xl py-4 text-white placeholder-amber-50/25 outline-none focus:border-lime-300/60 transition"
        />

        {error && <p className="text-rose-300 text-sm mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || !tag.trim()}
          className="w-full mt-4 py-3.5 rounded-xl font-bold text-emerald-950 bg-lime-300 hover:bg-lime-200 disabled:opacity-40 transition flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Check In <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>

      <p className="text-amber-50/45 text-xs mt-4">
        Your tag keeps you signed in on this phone all day.
      </p>
    </div>
  );
}
