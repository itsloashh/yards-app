"use client";
import { Trophy, X, Flag, Zap, Target, Award, TrendingDown } from "lucide-react";
import { rankTeams, teamTotals, formatToPar, parFor, holeAdjustment } from "@/lib/tournament";
import { colorOf } from "@/lib/powerUpStyles";

/**
 * End-of-round wrap-up. Shown when a team has a score on every hole.
 */
export default function RoundSummary({ state, myTeamId, onClose }) {
  const holes = state?.holes || [];
  const teams = state?.teams || [];
  const cards = state?.power_ups || [];
  const ranked = rankTeams(teams, holes, cards);

  const me = ranked.find((t) => t.id === myTeamId);
  const myPos = ranked.findIndex((t) => t.id === myTeamId) + 1;
  const totals = me ? me.totals : teamTotals({}, holes, cards);

  // Best and worst holes relative to par
  const holeResults = (me?.scores || [])
    .filter((s) => s.strokes > 0)
    .map((s) => {
      const val = s.strokes + (s.penalties || 0) + holeAdjustment(me, s.hole_number, cards, holes);
      return { hole: s.hole_number, val, diff: val - parFor(holes, s.hole_number) };
    });
  const best = [...holeResults].sort((a, b) => a.diff - b.diff)[0];
  const under = holeResults.filter((h) => h.diff < 0).length;

  const ledger = me?.power_up_uses || [];
  const spent = ledger.filter((e) => e.entry_type !== "grant");
  const earned = ledger.filter((e) => e.entry_type === "grant");
  const chalWins = (me?.challenge_wins || []).length;

  return (
    <div className="fixed inset-0 z-[880] flex items-end sm:items-center justify-center bg-black/80 animate-fade-in">
      <div className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[94vh] flex flex-col golf-felt">
        <div className="golf-chrome px-5 py-5 shrink-0 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5 text-white/80" />
          </button>
          <Trophy className="w-10 h-10 text-lime-300 mx-auto" />
          <h2 className="text-white font-display font-bold text-2xl mt-2">Round Complete</h2>
          <p className="text-amber-50/70 text-sm mt-0.5">{me?.name || "Your team"}</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Headline */}
          <div className="golf-card rounded-2xl p-5 text-center">
            <p className="text-amber-50/60 text-xs uppercase tracking-wider">Final score</p>
            <p className="text-white font-display font-bold text-5xl leading-none mt-1">{totals.total}</p>
            <p className={`text-lg font-bold mt-1 ${
              totals.toPar < 0 ? "text-lime-300" : totals.toPar > 0 ? "text-rose-300" : "text-amber-50"
            }`}>
              {formatToPar(totals.toPar)} <span className="text-amber-50/50 text-sm font-normal">to par</span>
            </p>
            {myPos > 0 && (
              <p className="text-amber-50/80 text-sm mt-3 flex items-center justify-center gap-1.5">
                <Award className="w-4 h-4 text-lime-300" />
                Finished <strong className="text-lime-300">{ordinal(myPos)}</strong> of {ranked.length}
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Flag} label="Holes played" value={totals.played} />
            <Stat icon={TrendingDown} label="Strokes" value={totals.strokes} />
            <Stat icon={Target} label="Penalties" value={totals.penalties} tone={totals.penalties > 0 ? "bad" : ""} />
            <Stat icon={Zap} label="Bonus strokes" value={totals.adjustments === 0 ? "—" : totals.adjustments} tone={totals.adjustments < 0 ? "good" : ""} />
          </div>

          {(best || under > 0 || chalWins > 0) && (
            <div className="golf-card rounded-2xl p-4 space-y-2">
              <h3 className="text-white font-bold text-sm mb-1">Highlights</h3>
              {best && (
                <Row label={`Best hole — #${best.hole}`} value={`${best.val} (${formatToPar(best.diff)})`} />
              )}
              {under > 0 && <Row label="Holes under par" value={under} />}
              {chalWins > 0 && <Row label="Challenges won" value={chalWins} />}
              {earned.length > 0 && <Row label="Cards earned" value={earned.length} />}
              {spent.length > 0 && <Row label="Cards played" value={spent.length} />}
            </div>
          )}

          {/* Cards played, by hole */}
          {spent.length > 0 && (
            <div className="golf-card rounded-2xl p-4">
              <h3 className="text-white font-bold text-sm mb-2.5">How you used them</h3>
              <div className="flex flex-wrap gap-1.5">
                {spent.map((u) => {
                  const card = cards.find((c) => c.id === u.power_up_id);
                  const cc = colorOf(card?.color);
                  return (
                    <span key={u.id} className={`text-[11px] ${cc.chip} px-2 py-1 rounded-full`}>
                      {card?.icon || "⚡"} {card?.name} · #{u.hole_number}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final standings */}
          <div className="golf-card rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm mb-2.5">Final standings</h3>
            <div className="space-y-1.5">
              {ranked.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  t.id === myTeamId ? "bg-lime-300/12 border border-lime-300/30" : "bg-emerald-950/50"
                }`}>
                  <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                    i === 0 ? "bg-lime-300 text-emerald-950" : "bg-emerald-900/70 text-amber-50/70"
                  }`}>{i + 1}</span>
                  <span className="text-white text-sm flex-1 min-w-0 truncate">{t.name}</span>
                  <span className={`text-sm font-bold ${
                    t.totals.toPar < 0 ? "text-lime-300" : t.totals.toPar > 0 ? "text-rose-300" : "text-white"
                  }`}>
                    {t.totals.played ? formatToPar(t.totals.toPar) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-amber-50/45 text-xs pb-2">
            Play together. Compete hard. Talk some shit. Have fun.
          </p>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-lime-200/10">
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-emerald-950 bg-lime-300">
            Back to my card
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="golf-card rounded-xl px-3 py-2.5">
      <p className="text-amber-50/55 text-[11px] flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</p>
      <p className={`font-bold text-lg mt-0.5 ${tone === "bad" ? "text-rose-300" : tone === "good" ? "text-lime-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-amber-50/70 text-xs">{label}</span>
      <span className="text-white text-xs font-bold">{value}</span>
    </div>
  );
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
