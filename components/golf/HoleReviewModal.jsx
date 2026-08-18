"use client";
import { useState, useMemo, useEffect } from "react";
import { Check, Loader2, Sparkles, AlertTriangle, X, ArrowRight } from "lucide-react";
import { setHolePowerUps } from "@/lib/tournament";
import { colorOf, eligibility, remainingFor, spendsOnHole } from "@/lib/powerUpStyles";

/**
 * Shown right after a hole score is saved.
 *  1. Announces anything the score automatically earned
 *  2. Lets the group tick which cards they used on that hole
 * Both write to the same ledger, so the inventory stays in step.
 */
export default function HoleReviewModal({
  hole, tag, cards = [], ledger = [], holes = [], granted = [], onDone, onSkip,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // What's already marked as used on this hole (so re-opening is accurate)
  const existing = useMemo(() => spendsOnHole(hole, ledger), [hole, ledger]);

  const [picked, setPicked] = useState(() => {
    const init = {};
    for (const e of existing) init[e.power_up_id] = e.option_label || true;
    return init;
  });
  useEffect(() => {
    const init = {};
    for (const e of existing) init[e.power_up_id] = e.option_label || true;
    setPicked(init);
  }, [existing]);

  // Cards usable on this hole. Anything already ticked stays visible even if
  // its balance is now 0, otherwise players couldn't untick their own entry.
  const usable = cards.filter((c) => {
    if (c.enabled === false) return false;
    if (!eligibility(c, hole, holes).ok) return false;
    const alreadyOn = picked[c.id] !== undefined;
    return alreadyOn || remainingFor(c, ledger) > 0;
  });

  const toggle = (card) => {
    setError("");
    setPicked((p) => {
      const next = { ...p };
      if (next[card.id] !== undefined) delete next[card.id];
      else next[card.id] = (card.options || []).length ? "" : true;
      return next;
    });
  };

  const chooseOption = (cardId, opt) => {
    setPicked((p) => ({ ...p, [cardId]: p[cardId] === opt ? "" : opt }));
  };

  const confirm = async () => {
    const selections = Object.entries(picked).map(([power_up_id, val]) => ({
      power_up_id,
      option_label: typeof val === "string" ? val : "",
    }));

    // Any card with an options list needs a choice before we send it
    for (const sel of selections) {
      const card = cards.find((c) => c.id === sel.power_up_id);
      if ((card?.options || []).length && !sel.option_label) {
        setError(`Pick an option for ${card.name}`);
        return;
      }
    }

    setBusy(true);
    const res = await setHolePowerUps(tag, hole, selections);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not save"); return; }
    onDone?.();
  };

  const hasGrants = granted.length > 0;

  return (
    <div className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center bg-black/75 animate-fade-in">
      <div className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col golf-felt">
        {/* Header */}
        <div className="golf-chrome px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-lime-300 text-[11px] font-bold uppercase tracking-wider">Hole {hole} saved</p>
            <h2 className="text-white font-display font-bold text-xl">Anything to log?</h2>
          </div>
          <button onClick={onSkip} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Awards earned from the score */}
          {hasGrants && (
            <div className="space-y-2">
              {granted.map((g, i) => {
                const c = colorOf(g.color);
                const hazard = g.kind === "hazard";
                return (
                  <div key={i} className={`rounded-2xl border ${c.ring} ${c.tint} ${c.glow} p-4`}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-950/60 flex items-center justify-center shrink-0 overflow-hidden">
                        <span className="text-2xl leading-none">{g.icon || (hazard ? "⚠️" : "⚡")}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${c.text}`}>
                          {hazard ? <><AlertTriangle className="w-3 h-3" /> Penalty received</> : <><Sparkles className="w-3 h-3" /> Earned</>}
                        </p>
                        <p className="text-white font-bold text-lg leading-tight mt-0.5">
                          {g.name} {g.amount > 1 && <span className={c.text}>×{g.amount}</span>}
                        </p>
                        {g.message && <p className="text-amber-50/80 text-xs mt-1 leading-relaxed">{g.message}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-amber-50/50 text-[11px] text-center">Added to your inventory automatically.</p>
            </div>
          )}

          {/* Mark what was used on this hole */}
          <div>
            <h3 className="text-white font-bold text-sm mb-1">Used on hole {hole}?</h3>
            <p className="text-amber-50/55 text-xs mb-3">
              Tick anything your team played here. Untick to take it back.
            </p>

            {usable.length === 0 ? (
              <p className="text-amber-50/40 text-xs bg-emerald-950/50 border border-lime-200/10 rounded-xl px-3 py-4 text-center">
                Nothing available to use on this hole.
              </p>
            ) : (
              <div className="space-y-2">
                {usable.map((card) => {
                  const c = colorOf(card.color);
                  const on = picked[card.id] !== undefined;
                  const opts = card.options || [];
                  const left = remainingFor(card, ledger);
                  return (
                    <div key={card.id} className={`rounded-xl border transition ${on ? `${c.ring} ${c.tint}` : "border-lime-200/10 bg-emerald-950/45"}`}>
                      <button onClick={() => toggle(card)} className="w-full text-left px-3 py-2.5 flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? `${c.dot} border-transparent` : "border-lime-200/30"}`}>
                          {on && <Check className="w-3.5 h-3.5 text-emerald-950" />}
                        </span>
                        <span className="text-lg leading-none shrink-0">{card.icon || "⚡"}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-white text-sm font-semibold truncate">{card.name}</span>
                          <span className="block text-amber-50/50 text-[11px]">{left} available</span>
                        </span>
                      </button>

                      {on && opts.length > 0 && (
                        <div className="px-3 pb-3 grid gap-1.5">
                          {opts.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => chooseOption(card.id, opt)}
                              className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                                picked[card.id] === opt
                                  ? `${c.tint} ${c.ring} text-white font-semibold`
                                  : "bg-emerald-950/60 border-lime-200/10 text-amber-50/75"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-rose-300 text-sm bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 px-5 py-4 border-t border-lime-200/10 flex gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-3 rounded-xl text-sm font-medium text-amber-50/70 bg-emerald-950/60 border border-lime-200/12"
          >
            Skip
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="flex-1 py-3 rounded-xl font-bold text-emerald-950 bg-lime-300 hover:bg-lime-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
