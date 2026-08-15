"use client";
import { useState, useMemo } from "react";
import { Zap, AlertTriangle, Check, Loader2, Undo2, Users, Lock } from "lucide-react";
import { usePowerUp, undoPowerUp } from "@/lib/tournament";
import { colorOf, eligibility, ruleLabel } from "@/lib/powerUpStyles";

export default function PowerUps({ round, state, myTeamId, onChanged }) {
  const tag = round?.player?.bag_tag;
  const allCards = state?.power_ups || round?.power_ups || [];
  const teams = state?.teams || [];
  const holes = round?.holes || state?.holes || [];
  const holeCount = holes.length || round?.tournament?.holes_count || 18;

  const myTeam = teams.find((t) => t.id === myTeamId);
  const myUses = myTeam?.power_up_uses || [];

  const [hole, setHole] = useState(round?.team?.starting_hole || 1);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  // Players only ever see cards that are switched on
  const cards = allCards.filter((c) => c.enabled !== false);
  const boosts = cards.filter((c) => c.kind !== "hazard");
  const cautions = cards.filter((c) => c.kind === "hazard");

  const usedCount = useMemo(() => {
    const m = {};
    for (const u of myUses) m[u.power_up_id] = (m[u.power_up_id] || 0) + 1;
    return m;
  }, [myUses]);

  const claim = async (card) => {
    setBusy(card.id); setError("");
    const res = await usePowerUp(tag, card.id, hole);
    setBusy(null);
    if (!res.ok) setError(res.error || "Could not use that");
    else onChanged?.();
  };

  const undo = async (useId) => {
    setBusy(useId); setError("");
    const res = await undoPowerUp(tag, useId);
    setBusy(null);
    if (!res.ok) setError(res.error || "Could not undo");
    else onChanged?.();
  };

  const par = holes.find((h) => h.hole_number === hole)?.par;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Hole picker — everything below is relative to this hole */}
      <div className="golf-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-amber-50/70 text-xs uppercase tracking-wider">Playing hole</p>
          {par && <p className="text-lime-300 text-xs font-semibold">Par {par}</p>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {Array.from({ length: holeCount }, (_, i) => i + 1).map((h) => (
            <button
              key={h}
              onClick={() => setHole(h)}
              className={`shrink-0 w-9 h-9 rounded-lg text-sm font-bold border transition ${
                h === hole ? "bg-lime-300 text-emerald-950 border-lime-200"
                : "bg-emerald-950/60 text-amber-50/55 border-lime-200/10"
              }`}
            >{h}</button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-rose-300 text-sm bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">{error}</p>
      )}

      {cards.length === 0 ? (
        <div className="golf-card rounded-2xl py-14 text-center">
          <Zap className="w-10 h-10 text-amber-50/20 mx-auto mb-2" />
          <p className="text-amber-50/60 text-sm">No cards set for this tournament.</p>
        </div>
      ) : (
        <>
          {boosts.length > 0 && (
            <CardGroup icon={Zap} title="Power-Ups">
              {boosts.map((card) => (
                <ClaimCard
                  key={card.id} card={card} hole={hole} holes={holes}
                  used={usedCount[card.id] || 0}
                  mine={myUses.filter((u) => u.power_up_id === card.id)}
                  busy={busy} onClaim={claim} onUndo={undo}
                />
              ))}
            </CardGroup>
          )}

          {cautions.length > 0 && (
            <CardGroup icon={AlertTriangle} title="Cautions">
              {cautions.map((card) => (
                <ClaimCard
                  key={card.id} card={card} hole={hole} holes={holes}
                  used={usedCount[card.id] || 0}
                  mine={myUses.filter((u) => u.power_up_id === card.id)}
                  busy={busy} onClaim={claim} onUndo={undo}
                />
              ))}
            </CardGroup>
          )}

          <AroundTheCourse teams={teams} myTeamId={myTeamId} cards={allCards} />
        </>
      )}
    </div>
  );
}

function CardGroup({ icon: Icon, title, children }) {
  return (
    <div>
      <h2 className="text-white font-bold font-display text-lg flex items-center gap-2 mb-2 px-1">
        <Icon className="w-5 h-5 text-lime-300" /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ClaimCard({ card, hole, holes, used, mine, busy, onClaim, onUndo }) {
  const c = colorOf(card.color);
  const left = Math.max(0, (card.uses_per_team || 1) - used);
  const elig = eligibility(card, hole, holes);
  const spent = left === 0;
  const blocked = !elig.ok;
  const disabled = spent || blocked || busy === card.id;

  return (
    <div className={`rounded-2xl border ${blocked || spent ? "border-lime-200/10" : c.ring} ${c.tint} overflow-hidden transition`}>
      {/* whole card is the button */}
      <button
        onClick={() => !disabled && onClaim(card)}
        disabled={disabled}
        className={`w-full text-left p-4 flex items-start gap-3 transition ${disabled ? "opacity-60" : "active:scale-[0.99]"}`}
      >
        <div className={`w-12 h-12 rounded-xl bg-emerald-950/60 border ${c.ring} flex items-center justify-center shrink-0 text-2xl`}>
          {card.icon || (card.kind === "hazard" ? "⚠️" : "⚡")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-bold leading-tight">{card.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${spent ? "bg-stone-700/70 text-amber-50/50" : c.chip}`}>
              {spent ? "Used" : `${left} left`}
            </span>
          </div>

          {card.description && (
            <p className="text-amber-50/75 text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">{card.description}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] text-amber-50/45 bg-emerald-950/50 px-2 py-0.5 rounded-full">
              {ruleLabel(card)}
            </span>
            {blocked && !spent && (
              <span className="text-[10px] text-amber-200 bg-amber-400/10 border border-amber-300/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> {elig.reason}
              </span>
            )}
          </div>

          {/* Action line */}
          <div className={`mt-3 rounded-xl py-2.5 text-center text-sm font-bold transition ${
            disabled ? "bg-emerald-950/60 text-amber-50/40" : c.btn
          }`}>
            {busy === card.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : spent ? <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> All used</span>
              : blocked ? elig.reason
              : `Use on hole ${hole}`}
          </div>
        </div>
      </button>

      {/* Undo chips for this team's uses */}
      {mine.length > 0 && (
        <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-1.5">
          {mine.map((u) => (
            <button
              key={u.id}
              onClick={() => onUndo(u.id)}
              disabled={busy === u.id}
              className="text-[11px] bg-emerald-950/70 border border-lime-200/15 text-amber-50/80 px-2 py-1 rounded-full flex items-center gap-1 hover:border-rose-300/40 transition"
            >
              {busy === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
              Undo hole {u.hole_number || "?"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AroundTheCourse({ teams, myTeamId, cards }) {
  const others = teams.filter((t) => t.id !== myTeamId);
  return (
    <div className="golf-card rounded-2xl p-4">
      <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-lime-300" /> Around the Course
      </h3>
      <div className="space-y-2.5">
        {others.length === 0 && <p className="text-amber-50/40 text-xs">No other teams yet.</p>}
        {others.map((t) => {
          const uses = t.power_up_uses || [];
          return (
            <div key={t.id} className="flex items-start justify-between gap-3">
              <p className="text-amber-50/85 text-sm min-w-0 truncate">{t.name}</p>
              {uses.length === 0 ? (
                <span className="text-amber-50/35 text-xs shrink-0">none used</span>
              ) : (
                <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[62%]">
                  {uses.map((u) => {
                    const card = cards.find((p) => p.id === u.power_up_id);
                    const cc = colorOf(card?.color);
                    return (
                      <span key={u.id} className={`text-[10px] ${cc.chip} px-1.5 py-0.5 rounded-full`}>
                        {card?.icon || "⚡"} {card?.name}{u.hole_number ? ` #${u.hole_number}` : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
