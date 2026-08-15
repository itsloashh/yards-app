"use client";
import { Clock, Flag, Users, Swords, Target, MapPin, Zap, AlertTriangle } from "lucide-react";
import { colorOf, ruleLabel } from "@/lib/powerUpStyles";

export default function RoundInfo({ round, state, myTeamId }) {
  const { tournament, team, player, partners = [], competitors = [], holes = [] } = round;
  const challengeHoles = holes.filter((h) => h.challenge && h.challenge.trim());

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

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Stat icon={Clock} label="Tee time" value={team?.tee_time || "TBD"} />
          <Stat icon={Flag} label="Start hole" value={`#${team?.starting_hole ?? 1}`} />
        </div>
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
                  <p className="text-white text-sm font-medium truncate">{h.challenge}</p>
                  <p className="text-amber-50/55 text-[11px]">Par {h.par}</p>
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
          const spentUses = usedFor(card.id);
          const total = card.uses_per_team || 1;
          const left = Math.max(0, total - spentUses.length);
          const hazard = card.kind === "hazard";

          return (
            <div key={card.id} className={`rounded-xl border ${left > 0 ? c.ring : "border-lime-200/10"} ${left > 0 ? c.tint : "bg-emerald-950/40"} px-3 py-2.5`}>
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
                  <p className="text-amber-50/45 text-[11px]">{ruleLabel(card)}</p>
                </div>

                {/* token pips */}
                <div className="flex items-center gap-1 shrink-0">
                  {Array.from({ length: Math.min(total, 5) }, (_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < left ? c.dot : "bg-amber-50/15"}`}
                    />
                  ))}
                  <span className={`ml-1 text-xs font-bold ${left > 0 ? c.text : "text-amber-50/35"}`}>
                    {left}/{total}
                  </span>
                </div>
              </div>

              {spentUses.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pl-10">
                  {spentUses.map((u) => (
                    <span key={u.id} className="text-[10px] bg-emerald-950/70 border border-lime-200/12 text-amber-50/60 px-1.5 py-0.5 rounded-full">
                      Hole {u.hole_number || "?"}{u.option_label ? ` · ${u.option_label}` : ""}
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

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-emerald-950/55 rounded-xl px-3 py-2.5 border border-lime-200/10">
      <p className="text-amber-50/55 text-[11px] flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</p>
      <p className="text-white font-bold mt-0.5">{value}</p>
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
