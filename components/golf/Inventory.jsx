"use client";
import { useMemo } from "react";
import { Zap, AlertTriangle, Sparkles, Hand, ClipboardCheck, Info } from "lucide-react";
import { colorOf, ruleLabel, remainingFor, receivedCount, isLogged, acquireMode, grantsFor, spendsFor } from "@/lib/powerUpStyles";

/**
 * Read-only inventory. Everything is claimed and spent from the scorecard now,
 * so this page exists to answer: what do we hold, where did it come from, and
 * where did it go.
 */
export default function Inventory({ round, state, myTeamId }) {
  const cards = (state?.power_ups || round?.power_ups || []).filter((c) => c.enabled !== false);
  const teams = state?.teams || [];
  const myTeam = teams.find((t) => t.id === myTeamId);
  const ledger = myTeam?.power_up_uses || [];

  const held = cards.filter((c) => !isLogged(c));
  const penalties = cards.filter((c) => isLogged(c) && c.kind === "hazard");
  const marks = cards.filter((c) => isLogged(c) && c.kind !== "hazard");

  if (cards.length === 0) {
    return (
      <div className="px-4 py-4">
        <div className="golf-card rounded-2xl py-14 text-center">
          <Zap className="w-10 h-10 text-amber-50/20 mx-auto mb-2" />
          <p className="text-amber-50/60 text-sm">No cards set for this tournament.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="golf-card rounded-2xl px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-lime-300 shrink-0 mt-0.5" />
        <p className="text-amber-50/70 text-xs leading-relaxed">
          Everything is claimed on the scorecard when you save a hole. This page is your record
          of what you're holding and what you've already played.
        </p>
      </div>

      {held.length > 0 && (
        <Group title="What you're holding" icon={Zap}>
          {held.map((c) => <InvCard key={c.id} card={c} ledger={ledger} />)}
        </Group>
      )}

      {marks.length > 0 && (
        <Group title="Bonuses earned on course" icon={Sparkles}>
          {marks.map((c) => <InvCard key={c.id} card={c} ledger={ledger} />)}
        </Group>
      )}

      {penalties.length > 0 && (
        <Group title="Penalties taken" icon={AlertTriangle}>
          {penalties.map((c) => <InvCard key={c.id} card={c} ledger={ledger} />)}
        </Group>
      )}

      <OtherTeams teams={teams} myTeamId={myTeamId} cards={cards} />
    </div>
  );
}

function Group({ title, icon: Icon, children }) {
  return (
    <div>
      <h2 className="text-white font-bold font-display text-lg flex items-center gap-2 mb-2 px-1">
        <Icon className="w-5 h-5 text-lime-300" /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InvCard({ card, ledger }) {
  const c = colorOf(card.color);
  const mode = acquireMode(card);
  const logged = isLogged(card);
  const grants = grantsFor(card.id, ledger);
  const spends = spendsFor(card.id, ledger);
  const left = logged ? receivedCount(card, ledger) : Math.max(0, remainingFor(card, ledger));
  const started = card.uses_per_team ?? 0;
  const earned = grants.reduce((a, g) => a + (g.delta ?? 1), 0);
  const active = left > 0;

  const ModeIcon = mode === "auto" ? Sparkles : mode === "logged" ? ClipboardCheck : Hand;
  const modeLabel = mode === "auto" ? "Earned from scores" : mode === "logged" ? "Marked on course" : "Carried from the start";

  return (
    <div className={`rounded-2xl border p-4 transition ${active ? `${c.ring} ${c.tint} ${c.glow}` : "border-lime-200/10 bg-emerald-950/40"}`}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-950/60 flex items-center justify-center shrink-0 overflow-hidden">
          <span className="text-xl leading-none">{card.icon || (card.kind === "hazard" ? "⚠️" : "⚡")}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-bold leading-tight">{card.name}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-bold ${active ? c.chip : "bg-stone-700/60 text-amber-50/50"}`}>
              {logged ? `${left}×` : `${left} left`}
            </span>
          </div>

          <p className="text-amber-50/50 text-[11px] mt-1 flex items-center gap-1">
            <ModeIcon className="w-3 h-3" /> {modeLabel} · {ruleLabel(card)}
            {!!card.score_effect && (
              <span className={card.score_effect < 0 ? "text-lime-300" : "text-rose-300"}>
                {" · "}{card.score_effect > 0 ? "+" : ""}{card.score_effect} stroke
              </span>
            )}
          </p>

          {/* Where it came from / where it went */}
          {(started > 0 || grants.length > 0 || spends.length > 0) && (
            <div className="mt-3 space-y-1.5 border-t border-lime-200/10 pt-2.5">
              {started > 0 && !logged && (
                <Line label={`Started the round with ${started}`} tone="muted" />
              )}
              {grants.map((g) => (
                <Line
                  key={g.id}
                  label={
                    logged
                      ? `Marked on hole ${g.hole_number || "?"}`
                      : `Earned on hole ${g.hole_number || "?"}${(g.delta ?? 1) > 1 ? ` (+${g.delta})` : ""}`
                  }
                  sub={g.source === "auto" ? "automatic" : g.used_by}
                  tone="good"
                />
              ))}
              {spends.map((u) => (
                <Line
                  key={u.id}
                  label={`Used on hole ${u.hole_number || "?"}`}
                  sub={[u.option_label, u.used_by].filter(Boolean).join(" · ")}
                  tone="spent"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Line({ label, sub, tone }) {
  const dot = tone === "good" ? "bg-lime-300" : tone === "spent" ? "bg-amber-50/30" : "bg-amber-50/15";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-amber-50/75 text-[11px] flex-1 min-w-0 truncate">{label}</span>
      {sub && <span className="text-amber-50/35 text-[10px] shrink-0 truncate max-w-[45%]">{sub}</span>}
    </div>
  );
}

function OtherTeams({ teams, myTeamId, cards }) {
  const others = teams.filter((t) => t.id !== myTeamId);
  if (!others.length) return null;
  return (
    <div className="golf-card rounded-2xl p-4">
      <h3 className="text-white font-bold text-sm mb-3">Around the Course</h3>
      <div className="space-y-2.5">
        {others.map((t) => {
          const spent = (t.power_up_uses || []).filter((u) => u.entry_type !== "grant");
          const marked = (t.power_up_uses || []).filter((u) => u.entry_type === "grant" && u.source === "manual");
          const all = [...spent, ...marked];
          return (
            <div key={t.id} className="flex items-start justify-between gap-3">
              <p className="text-amber-50/85 text-sm min-w-0 truncate">{t.name}</p>
              {all.length === 0 ? (
                <span className="text-amber-50/35 text-xs shrink-0">nothing yet</span>
              ) : (
                <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[62%]">
                  {all.map((u) => {
                    const card = cards.find((p) => p.id === u.power_up_id);
                    const cc = colorOf(card?.color);
                    return (
                      <span key={u.id} className={`text-[10px] ${cc.chip} px-1.5 py-0.5 rounded-full`}>
                        {card?.icon || "⚡"} #{u.hole_number || "?"}
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
