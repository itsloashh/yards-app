"use client";
import { useState } from "react";
import { Trash2, ChevronDown, Zap, AlertTriangle, Check, X, Sparkles, Hand, Settings2, ClipboardCheck } from "lucide-react";
import {
  CARD_COLORS, COLOR_KEYS, colorOf, ruleLabel,
  AWARD_PRESETS, AWARD_METRICS, AWARD_COMPARATORS,
  awardRuleLabel, isAutoAwarded, matchPreset, presetById,
  acquireMode, ACQUIRE_MODES,
} from "@/lib/powerUpStyles";

const PAR_OPTIONS = [3, 4, 5];

export default function AdminPowerUpCard({ card, holeCount = 18, onChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const c = colorOf(card.color);
  const hazard = card.kind === "hazard";
  const mode = acquireMode(card);
  const patch = (p) => onChange(card.id, p);

  const setMode = (next) => {
    if (next === "auto") {
      const pr = presetById(hazard ? "double" : "birdie");
      patch({ acquire_mode: "auto", award_metric: pr.metric, award_comparator: pr.comparator, award_value: pr.value, uses_per_team: 0 });
    } else if (next === "allowance") {
      patch({ acquire_mode: "allowance", award_metric: "none", uses_per_team: Math.max(1, card.uses_per_team ?? 1) });
    } else {
      patch({ acquire_mode: "logged", award_metric: "none", uses_per_team: 0 });
    }
  };

  return (
    <div className={`rounded-2xl border bg-stone-900 transition ${card.enabled === false ? "border-stone-800 opacity-60" : c.ring}`}>
      {/* ── Summary row ── */}
      <div className="p-4 flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl ${c.tint} border ${c.ring} flex items-center justify-center shrink-0 overflow-hidden`}>
          <span className="text-2xl leading-none truncate px-1 max-w-full">
            {card.icon || (hazard ? "⚠️" : "⚡")}
          </span>
        </div>

        <button onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold truncate">{card.name || "Untitled card"}</p>
          <p className="text-stone-400 text-xs mt-1">
            {mode === "auto" ? awardRuleLabel(card)
              : mode === "logged" ? "Players mark it when it happens"
              : `Teams start with ${card.uses_per_team ?? 0}`}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${hazard ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
              {hazard ? "Penalty" : "Reward"}
            </span>
            {ruleLabel(card) !== "Any hole" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">{ruleLabel(card)}</span>
            )}
            {(card.options || []).length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.chip}`}>{card.options.length} choices</span>
            )}
            {!!card.score_effect && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${card.score_effect < 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                {card.score_effect > 0 ? "+" : ""}{card.score_effect} stroke{Math.abs(card.score_effect) === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => patch({ enabled: !(card.enabled !== false) })}
            title={card.enabled === false ? "Off for this round" : "On"}
            className={`relative w-11 h-6 rounded-full transition ${card.enabled === false ? "bg-stone-700" : "bg-emerald-500"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${card.enabled === false ? "left-0.5" : "left-[22px]"}`} />
          </button>
          <button onClick={() => setOpen((v) => !v)} className="p-1.5 text-stone-400 hover:text-white">
            <ChevronDown className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Editor ── */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-stone-800 pt-4">
          {/* 1. Name + icon */}
          <div className="flex gap-2">
            <div>
              <L>Icon</L>
              <input
                value={card.icon || ""}
                onChange={(e) => patch({ icon: e.target.value.slice(0, 4) })}
                placeholder="⚡" maxLength={4}
                style={{ width: "4.5rem" }}
                className="admin-input text-center text-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <L>Name</L>
              <input
                value={card.name || ""}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Hot Streak"
                className="admin-input"
              />
            </div>
          </div>

          {/* 2. Reward or penalty */}
          <div>
            <L>Is this a reward or a penalty?</L>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={!hazard} onClick={() => patch({ kind: "power_up" })} icon={Zap}
                title="Reward" sub="A power-up teams want" tone="emerald" />
              <Choice active={hazard} onClick={() => patch({ kind: "hazard" })} icon={AlertTriangle}
                title="Penalty" sub="A caution against them" tone="rose" />
            </div>
          </div>

          {/* 3. How teams get it — the key decision */}
          <div>
            <L>How do teams get it?</L>
            <div className="grid gap-2">
              <Choice active={mode === "auto"} onClick={() => setMode("auto")}
                icon={Sparkles} title={ACQUIRE_MODES.auto.title} sub={ACQUIRE_MODES.auto.sub} tone="sky" />
              <Choice active={mode === "allowance"} onClick={() => setMode("allowance")}
                icon={Hand} title={ACQUIRE_MODES.allowance.title} sub={ACQUIRE_MODES.allowance.sub} tone="amber" />
              <Choice active={mode === "logged"} onClick={() => setMode("logged")}
                icon={ClipboardCheck} title={ACQUIRE_MODES.logged.title} sub={ACQUIRE_MODES.logged.sub} tone="rose" />
            </div>
          </div>

          {mode === "auto" && <AutoSettings card={card} patch={patch} />}
          {mode === "allowance" && <ManualSettings card={card} patch={patch} />}
          {mode === "logged" && <LoggedSettings hazard={hazard} />}

          {/* 3b. Stroke effect */}
          <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
            <L>Does using it change the score?</L>
            <p className="text-stone-500 text-[11px] mb-2.5">
              Applied automatically to the hole it's used on. Use −1 for the 15-Footer Bonus or
              Closest to the Pin. Leave 0 for cards that only change how you play the shot.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => patch({ score_effect: (card.score_effect ?? 0) - 1 })}
                className="w-9 h-9 rounded-lg bg-stone-800 text-white text-lg leading-none">−</button>
              <span className={`min-w-[4rem] text-center font-bold text-lg ${
                (card.score_effect ?? 0) < 0 ? "text-emerald-400" : (card.score_effect ?? 0) > 0 ? "text-rose-400" : "text-stone-400"
              }`}>
                {(card.score_effect ?? 0) > 0 ? "+" : ""}{card.score_effect ?? 0}
              </span>
              <button onClick={() => patch({ score_effect: (card.score_effect ?? 0) + 1 })}
                className="w-9 h-9 rounded-lg bg-stone-800 text-white text-lg leading-none">+</button>
              <span className="text-stone-500 text-xs ml-1">strokes</span>
            </div>
          </div>

          {/* 4. Description */}
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

          {/* 5. Everything else, tucked away */}
          <button
            onClick={() => setAdvanced((v) => !v)}
            className="w-full flex items-center justify-between text-stone-400 hover:text-white text-xs py-2 border-t border-stone-800"
          >
            <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> More settings</span>
            <ChevronDown className={`w-4 h-4 transition ${advanced ? "rotate-180" : ""}`} />
          </button>

          {advanced && (
            <div className="space-y-4">
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

              <HoleRules card={card} patch={patch} holeCount={holeCount} />
              <OptionsEditor options={card.options || []} onChange={(next) => patch({ options: next })} />

              <button onClick={() => onDelete(card.id)} className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete this card
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Automatic award settings ── */
function AutoSettings({ card, patch }) {
  const preset = matchPreset(card);
  const custom = preset === "custom";

  const applyPreset = (id) => {
    if (id === "custom") return;
    const p = presetById(id);
    if (p) patch({ award_metric: p.metric, award_comparator: p.comparator, award_value: p.value });
  };

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 space-y-3">
      <div>
        <L>Awarded when…</L>
        <select
          value={preset || "birdie"}
          onChange={(e) => applyPreset(e.target.value)}
          className="admin-input"
        >
          {AWARD_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          <option value="custom">Custom…</option>
        </select>
      </div>

      {custom && (
        <div className="flex flex-wrap gap-2">
          <select value={card.award_metric} onChange={(e) => patch({ award_metric: e.target.value })}
            className="admin-input" style={{ width: "auto", minWidth: "9rem" }}>
            {AWARD_METRICS.filter((m) => m.id !== "none").map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select value={card.award_comparator || "lte"} onChange={(e) => patch({ award_comparator: e.target.value })}
            className="admin-input" style={{ width: "auto", minWidth: "8rem" }}>
            {AWARD_COMPARATORS.map((cp) => <option key={cp.id} value={cp.id}>{cp.label}</option>)}
          </select>
          <input value={card.award_value ?? 0} onChange={(e) => patch({ award_value: parseInt(e.target.value) || 0 })}
            inputMode="numeric" style={{ width: "5rem" }} className="admin-input text-center" />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div>
          <L>How many</L>
          <input value={card.award_amount ?? 1}
            onChange={(e) => patch({ award_amount: Math.max(1, parseInt(e.target.value) || 1) })}
            inputMode="numeric" style={{ width: "5rem" }} className="admin-input text-center" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <L>Popup message</L>
          <input value={card.award_message || ""}
            onChange={(e) => patch({ award_message: e.target.value })}
            placeholder="Nice birdie — take a token!" className="admin-input" />
        </div>
      </div>

      <p className="text-sky-300 text-xs bg-sky-500/10 border border-sky-500/25 rounded-lg px-3 py-2">
        {awardRuleLabel(card)}
      </p>
      <p className="text-stone-500 text-[11px]">
        Score counts strokes + penalties, so a birdie with a penalty stroke won't award.
      </p>
    </div>
  );
}

/* ── Manual settings ── */
function ManualSettings({ card, patch }) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
      <L>How many does each team start with?</L>
      <input
        value={card.uses_per_team ?? 1}
        onChange={(e) => patch({ uses_per_team: Math.max(0, parseInt(e.target.value) || 0) })}
        inputMode="numeric" style={{ width: "6rem" }} className="admin-input text-center"
      />
      <p className="text-stone-500 text-[11px] mt-1.5">
        Teams tick this off themselves when they play it on a hole.
      </p>
    </div>
  );
}

/* ── Logged (no allowance) ── */
function LoggedSettings({ hazard }) {
  return (
    <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
      <p className="text-rose-300 text-xs font-medium">No allowance needed</p>
      <p className="text-stone-400 text-[11px] mt-1 leading-relaxed">
        This appears under <strong>“What happened on this hole?”</strong> when a team saves their score.
        Ticking it records {hazard ? "the penalty" : "it"} against that hole — there's no limit, because it
        either happened or it didn't. Untick to take it back.
      </p>
    </div>
  );
}

/* ── Hole restrictions ── */
function HoleRules({ card, patch, holeCount }) {
  const holes = card.allowed_holes || [];
  const pars = card.allowed_pars || [];
  const toggleHole = (h) =>
    patch({ allowed_holes: holes.includes(h) ? holes.filter((x) => x !== h) : [...holes, h].sort((a, b) => a - b) });
  const togglePar = (p) =>
    patch({ allowed_pars: pars.includes(p) ? pars.filter((x) => x !== p) : [...pars, p].sort() });

  return (
    <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3">
      <L>Where it can be used</L>
      <p className="text-stone-500 text-[11px] mb-2.5">Leave empty for any hole.</p>

      <p className="text-stone-400 text-xs mb-1.5">By par</p>
      <div className="flex gap-1.5 mb-3">
        {PAR_OPTIONS.map((p) => (
          <button key={p} onClick={() => togglePar(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              pars.includes(p) ? "bg-emerald-500 text-white border-emerald-400" : "bg-stone-900 text-stone-400 border-stone-700"
            }`}>Par {p}</button>
        ))}
        {pars.length > 0 && (
          <button onClick={() => patch({ allowed_pars: [] })} className="px-2.5 py-1.5 text-stone-500 hover:text-white text-xs">clear</button>
        )}
      </div>

      <p className="text-stone-400 text-xs mb-1.5">By hole number</p>
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: holeCount }, (_, i) => i + 1).map((h) => (
          <button key={h} onClick={() => toggleHole(h)}
            className={`py-1.5 rounded text-xs font-medium border transition ${
              holes.includes(h) ? "bg-emerald-500 text-white border-emerald-400" : "bg-stone-900 text-stone-500 border-stone-700"
            }`}>{h}</button>
        ))}
      </div>
      {holes.length > 0 && (
        <button onClick={() => patch({ allowed_holes: [] })} className="mt-2 text-stone-500 hover:text-white text-xs">clear hole selection</button>
      )}
    </div>
  );
}

/* ── Player choices ── */
function OptionsEditor({ options, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || options.includes(v)) { setDraft(""); return; }
    onChange([...options, v]);
    setDraft("");
  };
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const next = [...options]; const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3">
      <L>Player choices <span className="text-stone-600">(optional)</span></L>
      <p className="text-stone-500 text-[11px] mb-2.5">
        If the reward is a menu, add the choices here and the player picks one when they use it.
      </p>

      {options.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-2">
              <span className="w-5 h-5 rounded bg-stone-800 text-stone-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="text-stone-200 text-sm flex-1 min-w-0 break-words">{opt}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-stone-600 hover:text-white disabled:opacity-25 text-xs px-1">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === options.length - 1} className="text-stone-600 hover:text-white disabled:opacity-25 text-xs px-1">↓</button>
              <button onClick={() => remove(i)} className="text-stone-600 hover:text-rose-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. Replay one shot" className="admin-input flex-1" />
        <button onClick={add} disabled={!draft.trim()} style={{ width: "5rem" }}
          className="shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium disabled:opacity-40">Add</button>
      </div>
    </div>
  );
}

function Choice({ active, onClick, icon: Icon, title, sub, tone }) {
  const tones = {
    emerald: "border-emerald-500 bg-emerald-500/15 text-emerald-300",
    rose: "border-rose-500 bg-rose-500/15 text-rose-300",
    sky: "border-sky-500 bg-sky-500/15 text-sky-300",
    amber: "border-amber-500 bg-amber-500/15 text-amber-300",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-xl border transition ${
        active ? tones[tone] : "border-stone-700 bg-stone-950/50 text-stone-400 hover:border-stone-600"
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="w-4 h-4" /> {title}
      </span>
      <span className="block text-[11px] mt-0.5 opacity-80">{sub}</span>
    </button>
  );
}

function L({ children }) {
  return <label className="block text-stone-400 text-xs mb-1.5">{children}</label>;
}
