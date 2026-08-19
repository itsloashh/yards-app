"use client";
import { useState } from "react";
import { X, BookOpen, Sparkles, Check } from "lucide-react";
import { colorOf } from "@/lib/powerUpStyles";

/**
 * Rules viewer for any game mode. Same timeline treatment as the tournament
 * How to Play, but driven by whichever mode is being played.
 */
export default function GameRules({ mode, onClose }) {
  const hasTwists = (mode.twists || []).length > 0;
  const [tab, setTab] = useState("core");

  return (
    <div className="fixed inset-0 z-[850] flex items-end sm:items-center justify-center bg-black/75 animate-fade-in">
      <div className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col golf-felt">
        <div className="golf-chrome px-5 py-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-white font-display font-bold text-xl">{mode.meta?.name || mode.name}</h2>
              <p className="text-lime-300 text-xs mt-0.5">{mode.meta?.tagline || mode.tagline}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>

          {hasTwists && (
            <div className="flex gap-1 bg-emerald-950/60 border border-lime-200/12 rounded-xl p-1 mt-3">
              <Tab active={tab === "core"} onClick={() => setTab("core")} icon={BookOpen} label="The Rules" />
              <Tab active={tab === "twist"} onClick={() => setTab("twist")} icon={Sparkles} label="Yard$ Twists" />
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {(!hasTwists || tab === "core") ? (
            <>
              {mode.meta?.motto && (
                <p className="text-amber-50/70 text-sm italic text-center mb-4">{mode.meta.motto}</p>
              )}
              <ol className="relative border-l border-lime-300/25 ml-4 space-y-5">
                {(mode.rules || []).map((r) => (
                  <li key={r.n} className="ml-5">
                    <span className="absolute -left-[15px] w-7 h-7 rounded-full bg-lime-300 text-emerald-950 text-xs font-bold flex items-center justify-center">
                      {r.n}
                    </span>
                    <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                      <span className="text-base leading-none">{r.icon}</span> {r.title}
                    </h3>
                    <p className="text-amber-50/80 text-xs mt-1 leading-relaxed">{r.body}</p>
                  </li>
                ))}
              </ol>

              {mode.standard && (
                <div className="mt-6 golf-card rounded-xl p-4">
                  <p className="text-lime-300 text-xs font-bold uppercase tracking-wider text-center mb-2.5">
                    Yard$ Fun Round Standard
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {mode.standard.map((s) => (
                      <span key={s} className="text-[11px] bg-emerald-950/70 border border-lime-200/15 text-amber-50/85 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3 text-lime-300" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mode.meta?.footer && (
                <p className="text-lime-300/80 text-xs text-center mt-5 font-semibold">{mode.meta.footer}</p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-amber-50/70 text-xs text-center mb-3">Extra fun. Extra excitement.</p>
              {mode.twists.map((r) => {
                const c = colorOf(r.color);
                return (
                  <div key={r.key} className={`rounded-xl border ${c.ring} ${c.tint} p-3.5`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-950/60 flex items-center justify-center shrink-0 text-xl">{r.icon}</div>
                      <div className="min-w-0">
                        <h3 className={`font-bold text-sm ${c.text}`}>{r.title}</h3>
                        <p className="text-amber-50/85 text-xs mt-1 leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
        active ? "bg-lime-300 text-emerald-950" : "text-amber-50/60"
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
