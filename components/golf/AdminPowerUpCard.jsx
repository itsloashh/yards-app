"use client";
import { useState } from "react";
import { Trash2, ChevronDown, Zap, AlertTriangle, Check } from "lucide-react";
import { CARD_COLORS, COLOR_KEYS, colorOf, ruleLabel } from "@/lib/powerUpStyles";

const PAR_OPTIONS = [3, 4, 5];

export default function AdminPowerUpCard({ card, holeCount = 18, onChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const c = colorOf(card.color);
  const hazard = card.kind === "hazard";
  const holes = card.allowed_holes || [];
  const pars = card.allowed_pars || [];

  const patch = (p) => onChange(card.id, p);

  const toggleHole = (h) => {
    const next = holes.includes(h) ? holes.filter((x) => x !== h) : [...holes, h].sort((a, b) => a - b);
    patch({ allowed_holes: next });
  };
  const togglePar = (p) => {
    const next = pars.includes(p) ? pars.filter((x) => x !== p) : [...pars, p].sort();
    patch({ allowed_pars: next });
  };

  return (
    <div className={`rounded-2xl border bg-stone-900 transition ${card.enabled === false ? "border-stone-800 opacity-60" : c.ring}`}>
      {/* ── Header row ── */}
      <div className="p-4 flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl ${c.tint} border ${c.ring} flex items-center justify-center shrink-0 text-2xl`}>
          {card.icon || (hazard ? "⚠️" : "⚡")}
        </div>

        <div className="flex-1 min-w-0">
          <input
            value={card.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Card name"
            className="w-full bg-transparent text-white font-bold outline-none border-b border-transparent focus:border-stone-600 transition"
          />
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${hazard ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
              {hazard ? "Caution" : "Power-Up"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
              {card.uses_per_team ?? 1}× per team
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
              {ruleLabel(card)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* usable toggle */}
          <button
            onClick={() => patch({ enabled: !(card.enabled !== false) })}
            title={card.enabled === false ? "Switched off" : "Usable"}
            className={`relative w-11 h-6 rounded-full transition ${card.enabled === false ? "bg-stone-700" : "bg-emerald-500"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${card.enabled === false ? "left-0.5" : "left-[22px]"}`} />
          </button>
          <button onClick={() => setOpen((v) => !v)} className="p-1.5 text-stone-400 hover:text-white">
            <ChevronDown className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Expanded editor ── */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-stone-800 pt-4">
          {/* kind + icon + colour */}
          <div className="flex flex-wrap gap-3">
            <div>
              <L>Type</L>
              <div className="flex gap-1 bg-stone-950 border border-stone-800 rounded-lg p-1">
                <button
                  onClick={() => patch({ kind: "power_up" })}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${!hazard ? "bg-emerald-500 text-white" : "text-stone-400"}`}
                >
                  <Zap className="w-3.5 h-3.5" /> Power-Up
                </button>
                <button
                  onClick={() => patch({ kind: "hazard" })}
                  className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${hazard ? "bg-rose-500 text-white" : "text-stone-400"}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Caution
                </button>
              </div>
            </div>

            <div>
              <L>Icon</L>
              <input
                value={card.icon || ""}
                onChange={(e) => patch({ icon: e.target.value })}
                placeholder="⚡"
                className="admin-input w-20 text-center text-lg"
              />
            </div>

            <div>
              <L>Uses per team</L>
              <input
                value={card.uses_per_team ?? 1}
                onChange={(e) => patch({ uses_per_team: parseInt(e.target.value) || 1 })}
                inputMode="numeric"
                className="admin-input w-24"
              />
            </div>
          </div>

          <div>
            <L>Colour</L>
            <div className="flex gap-2 flex-wrap">
              {COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => patch({ color: k })}
                  title={CARD_COLORS[k].label}
                  className={`w-8 h-8 rounded-lg ${CARD_COLORS[k].dot} flex items-center justify-center transition ${
                    card.color === k ? "ring-2 ring-white ring-offset-2 ring-offset-stone-900" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {card.color === k && <Check className="w-4 h-4 text-stone-900" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <L>Description — what the player reads</L>
            <textarea
              value={card.description || ""}
              onChange={(e) => patch({ description: e.target.value })}
              rows={3}
              placeholder="Explain how it works and any conditions."
              className="admin-input resize-none"
            />
          </div>

          {/* ── Hole rules ── */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3">
            <L>Where it can be used</L>
            <p className="text-stone-500 text-[11px] mb-2.5">
              Leave both empty for any hole. Par filter is the easy way to do things like “par 5 only”.
            </p>

            <p className="text-stone-400 text-xs mb-1.5">By par</p>
            <div className="flex gap-1.5 mb-3">
              {PAR_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePar(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    pars.includes(p)
                      ? "bg-emerald-500 text-white border-emerald-400"
                      : "bg-stone-900 text-stone-400 border-stone-700 hover:border-stone-600"
                  }`}
                >
                  Par {p}
                </button>
              ))}
              {pars.length > 0 && (
                <button onClick={() => patch({ allowed_pars: [] })} className="px-2.5 py-1.5 text-stone-500 hover:text-white text-xs">
                  clear
                </button>
              )}
            </div>

            <p className="text-stone-400 text-xs mb-1.5">By hole number</p>
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: holeCount }, (_, i) => i + 1).map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHole(h)}
                  className={`py-1.5 rounded text-xs font-medium border transition ${
                    holes.includes(h)
                      ? "bg-emerald-500 text-white border-emerald-400"
                      : "bg-stone-900 text-stone-500 border-stone-700 hover:border-stone-600"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            {holes.length > 0 && (
              <button onClick={() => patch({ allowed_holes: [] })} className="mt-2 text-stone-500 hover:text-white text-xs">
                clear hole selection
              </button>
            )}
          </div>

          <button
            onClick={() => onDelete(card.id)}
            className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete this card
          </button>
        </div>
      )}
    </div>
  );
}

function L({ children }) {
  return <label className="block text-stone-400 text-xs mb-1.5">{children}</label>;
}
