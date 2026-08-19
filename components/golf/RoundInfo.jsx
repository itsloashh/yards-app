"use client";
import { Flag, Users, Swords, Target, MapPin, Zap, AlertTriangle, Gift, BookOpen, Coins } from "lucide-react";
import TeeCountdown from "@/components/golf/TeeCountdown";
import { colorOf, ruleLabel, remainingFor, grantsFor, spendsFor, isAutoAwarded, isLogged, receivedCount, acquireMode } from "@/lib/powerUpStyles";

export default function RoundInfo({ round, state, myTeamId, onShowRules }) {
  const { tournament, team, player, partners = [], competitors = [], holes = [] } = round;
  const challengeHoles = holes.filter((h) => h.challenge && h.challenge.trim());
  const jackpot = holes.find((h) => h.is_jackpot);

  const holesLabel = (() => {
    if (!holes.length) return "";
    if ((tournament?.holes_count ?? 18) === 9) {
      const side = tournament?.nine_side === "back" ? "Back 9" : "Front 9";
      return `${side} — holes ${holes[0].hole_number}–${holes[holes.length - 1].hole_number}`;
    }
    return "18 holes";
  })();

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Tee sheet */}
      <div className="golf-card rounded-2xl p-5">
        <p className="text-lime-300 text-xs font-bold uppercase tracking-wider">{tournament?.format || "Tournament"}</p>
        <h1 className="text-white font-bold font-display text-2xl mt-0.5">{tournament?.name}</h1>
        {tournament?.course && (
          <p className="text-amber-50/70 text-sm mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {tournament.course}
          </p>
        )}

        <div className="mt-4">
          <TeeCountdown team={team} />
        </div>

        {holesLabel && (
          <p className="text-amber-50/55 text-xs mt-3 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5" /> {holesLabel}
          </p>
        )}

        <button
          onClick={() => onShowRules?.()}
          className="w-full mt-3 py-2.5 rounded-xl bg-lime-300/15 border border-lime-300/35 text-lime-200 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
        >
          <BookOpen className="w-4 h-4" /> How to Play
        </button>
      </div>

      {/* Your team */}
      <div className="golf-card rounded-2xl p-5">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-lime-300" /> Your Team
        </h2>
        <p className="text-lime-300 font-display font-bold text-lg mt-1">{team?.name}</p>
        {team?.flight && <p className="text-amber-50/60 text-xs mt-0.5">Flight {team.flight}</p>}

        <div className="mt-3 space-y-1.5">
          <PlayerRow name={player?.name} you />
          {partners.map((p) => <PlayerRow key={p.id} name={p.name} />)}
          {partners.length === 0 && (
            <p className="text-amber-50/50 text-xs italic">No partner assigned yet.</p>
          )}
        </div>
      </div>

      {/* Inventory */}
      <Inventory round={round} state={state} myTeamId={myTeamId} />

      {/* Playing with */}
      <div className="golf-card rounded-2xl p-5">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Swords className="w-4 h-4 text-lime-300" /> Playing Against
        </h2>
        {competitors.length === 0 ? (
          <p className="text-amber-50/50 text-sm mt-2 italic">
            No other team is sharing your tee time yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {competitors.map((c) => (
              <div key={c.team_id}>
                <p className="text-white font-semibold text-sm">{c.team_name}</p>
                <p className="text-amber-50/70 text-xs mt-0.5">{(c.players || []).join(" · ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jackpot hole */}
      {jackpot && (
        <div className="golf-card rounded-2xl p-5 border-amber-300/40">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300" /> Jackpot Hole
          </h2>
          <div className="flex items-center gap-3 mt-3">
            <span className="w-11 h-11 rounded-xl bg-amber-300 text-stone-900 font-bold text-lg flex items-center justify-center shrink-0">
              {jackpot.hole_number}
            </span>
            <p className="text-amber-50/85 text-sm">
              All bonuses on this hole are worth <strong className="text-amber-300">double</strong>. Big risk. Bigger reward.
            </p>
          </div>
        </div>
      )}

      {/* Challenge holes */}
      <div className="golf-card rounded-2xl p-5">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Target className="w-4 h-4 text-lime-300" /> Challenge Holes
        </h2>
        {challengeHoles.length === 0 ? (
          <p className="text-amber-50/50 text-sm mt-2 italic">No challenge holes set for this round.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {challengeHoles.map((h) => (
              <div key={h.hole_number} className="flex items-center gap-3 bg-emerald-950/50 rounded-xl px-3 py-2.5 border border-lime-200/10">
                <span className="w-8 h-8 rounded-lg bg-lime-300 text-emerald-950 font-bold text-sm flex items-center justify-center shrink-0">
                  {h.hole_number}
                </span>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{h.challenge}</p>
                  <p className="text-amber-50/55 text-[11px]">Par {h.par}</p>
                  {h.challenge_reward && (
                    <p className="text-lime-300/90 text-[11px] mt-1 flex items-start gap-1">
                      <Gift className="w-3 h-3 mt-0.5 shrink-0" /> <span>{h.challenge_reward}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tournament?.notes && (
        <div className="golf-card rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-2">Notes from the organizer</h2>
          <p className="text-amber-50/85 text-sm whitespace-pre-wrap leading-relaxed">{tournament.notes}</p>
        </div>
      )}
    </div>
  );
}

function Inventory({ round, state, myTeamId }) {
  const cards = (state?.power_ups || round?.power_ups || []).filter((c) => c.enabled !== false);
  const myTeam = (state?.teams || []).find((t) => t.id === myTeamId);
  const uses = myTeam?.power_up_uses || [];

  if (cards.length === 0) return null;

  const usedFor = (id) => uses.filter((u) => u.power_up_id === id);

  return (
    <div className="golf-card rounded-2xl p-5">
      <h2 className="text-white font-bold flex items-center gap-2">
        <Zap className="w-4 h-4 text-lime-300" /> Your Inventory
      </h2>
      <p className="text-amber-50/55 text-xs mt-0.5 mb-3">What your team has left to play.</p>

      <div className="space-y-2">
        {cards.map((card) => {
          const c = colorOf(card.color);
          const grants = grantsFor(card.id, uses);
          const spends = spendsFor(card.id, uses);
          const earned = grants.reduce((a, g) => a + (g.delta ?? 1), 0);
          const hazard = card.kind === "hazard";
          const logged = isLogged(card);

          // Logged penalties accumulate; everything else depletes.
          const left = logged ? receivedCount(card, uses) : Math.max(0, remainingFor(card, uses));
          const total = logged ? Math.max(left, 1) : (card.uses_per_team ?? 0) + earned;
          const highlight = logged ? left > 0 : left > 0;

          return (
            <div key={card.id} className={`rounded-xl border px-3 py-2.5 transition ${
              highlight ? `${c.ring} ${c.tint} ${c.glow}` : "border-lime-200/10 bg-emerald-950/40"
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-950/60 flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-base leading-none truncate px-0.5">
                    {card.icon || (hazard ? "⚠️" : "⚡")}
                  </span>
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate flex items-center gap-1.5">
                    {hazard && <AlertTriangle className="w-3 h-3 text-rose-300 shrink-0" />}
                    {card.name}
                  </p>
                  <p className="text-amber-50/45 text-[11px]">
                    {ruleLabel(card)}
                    {isAutoAwarded(card) && <span className="text-lime-300/70"> · auto</span>}
                    {logged && <span className="text-rose-300/70"> · penalty</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!logged && Array.from({ length: Math.min(Math.max(total, 1), 5) }, (_, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full ${i < left ? c.dot : "bg-amber-50/15"}`} />
                  ))}
                  <span className={`ml-1 text-xs font-bold ${left > 0 ? c.text : "text-amber-50/35"}`}>
                    {logged ? `${left}×` : left}
                  </span>
                </div>
              </div>

              {(earned > 0 || spends.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2 pl-10">
                  {grants.map((g) => (
                    <span key={g.id} className={`text-[10px] ${c.chip} px-1.5 py-0.5 rounded-full`}>
                      {logged ? "hole " + (g.hole_number || "?") : `+${g.delta ?? 1} earned${g.hole_number ? ` · hole ${g.hole_number}` : ""}`}
                    </span>
                  ))}
                  {spends.map((u) => (
                    <span key={u.id} className="text-[10px] bg-emerald-950/70 border border-lime-200/12 text-amber-50/60 px-1.5 py-0.5 rounded-full">
                      used hole {u.hole_number || "?"}{u.option_label ? ` · ${u.option_label}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerRow({ name, you }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-lime-300" />
      <span className="text-amber-50/90 text-sm">{name}</span>
      {you && <span className="text-[10px] bg-lime-300/20 text-lime-300 px-1.5 py-0.5 rounded">you</span>}
    </div>
  );
}
