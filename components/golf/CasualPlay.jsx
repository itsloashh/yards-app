"use client";
import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Minus, Plus, Check, Trophy, BookOpen,
  Users, ClipboardList, Loader2,
} from "lucide-react";
import { saveHoleScore, setHoleCards, setChallengeWinLocal, cardsForRound, toStateShape } from "@/lib/casualRound";
import { parFor, formatToPar, holeAdjustment, rankTeams } from "@/lib/tournament";
import { modeById } from "@/lib/gameModes";
import HoleReviewModal from "@/components/golf/HoleReviewModal";
import RoundSummary from "@/components/golf/RoundSummary";
import GameRules from "@/components/golf/GameRules";

export default function CasualPlay({ round, setRound, onExit }) {
  const mode = modeById(round.modeId);
  const cards = useMemo(() => cardsForRound(round), [round]);
  const holes = round.holes;
  const numbers = holes.map((h) => h.hole_number);

  const [teamId, setTeamId] = useState(round.teams[0]?.id);
  const [active, setActive] = useState(numbers[0]);
  const [strokes, setStrokes] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [review, setReview] = useState(null);
  const [tab, setTab] = useState("card");
  const [showRules, setShowRules] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [seen, setSeen] = useState(false);

  const team = round.teams.find((t) => t.id === teamId);
  const scoreMap = useMemo(() => {
    const m = {};
    for (const s of team?.scores || []) m[s.hole_number] = s;
    return m;
  }, [team]);

  useEffect(() => {
    const s = scoreMap[active];
    setStrokes(s?.strokes ?? 0);
    setPenalties(s?.penalties ?? 0);
  }, [active, teamId, scoreMap]);

  useEffect(() => {
    if (round.status === "complete" && !seen) { setShowSummary(true); setSeen(true); }
  }, [round.status, seen]);

  const par = parFor(holes, active);
  const holeInfo = holes.find((h) => h.hole_number === active);
  const alreadyRecorded = (scoreMap[active]?.strokes ?? 0) > 0;

  const nextHole = useMemo(() => {
    const i = numbers.indexOf(active);
    for (let step = 1; step <= numbers.length; step++) {
      const h = numbers[(i + step) % numbers.length];
      if (!(scoreMap[h]?.strokes > 0)) return h;
    }
    return numbers[(i + 1) % numbers.length];
  }, [active, numbers, scoreMap]);

  const commit = () => {
    if (strokes <= 0) return;
    const { round: next, granted } = saveHoleScore(round, teamId, active, strokes, penalties);
    setRound(next);
    if (mode.usesCards) {
      setReview({ hole: active, granted });
    } else {
      setActive(nextHole);
    }
  };

  const closeReview = () => {
    const done = review?.hole;
    setReview(null);
    if (done === active) setActive(nextHole);
  };

  const state = toStateShape(round);
  const ranked = rankTeams(round.teams, holes, cards);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{mode.name}</p>
          <p className="text-amber-50/55 text-xs truncate">
            {round.course || "Casual round"} · {round.holesCount} holes
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowRules(true)}
            className="text-amber-50/70 hover:text-white text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-lime-200/10">
            <BookOpen className="w-3.5 h-3.5" /> Rules
          </button>
          <button onClick={onExit}
            className="text-amber-50/60 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-lime-200/10">
            Exit
          </button>
        </div>
      </div>

      {round.status === "complete" && (
        <div className="px-4 mt-3">
          <button onClick={() => setShowSummary(true)}
            className="w-full py-3 rounded-xl bg-lime-300 text-emerald-950 font-bold text-sm flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" /> View round summary
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mt-3">
        <div className="flex gap-1 bg-emerald-950/60 border border-lime-200/12 rounded-xl p-1">
          <TabBtn active={tab === "card"} onClick={() => setTab("card")} icon={ClipboardList} label="Scorecard" />
          <TabBtn active={tab === "board"} onClick={() => setTab("board")} icon={Trophy} label="Standings" />
        </div>
      </div>

      {/* Whose card */}
      <div className="px-4 mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {round.teams.map((t) => (
          <button key={t.id} onClick={() => setTeamId(t.id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium border transition ${
              t.id === teamId ? "bg-lime-300 text-emerald-950 border-lime-200" : "bg-emerald-950/55 text-amber-50/70 border-lime-200/12"
            }`}>
            {t.name}
          </button>
        ))}
      </div>

      {tab === "card" ? (
        <div className="px-4 py-4">
          {/* Hole strip */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {numbers.map((h) => {
              const done = scoreMap[h]?.strokes > 0;
              return (
                <button key={h} onClick={() => setActive(h)}
                  className={`shrink-0 w-10 h-10 rounded-lg text-sm font-bold border transition ${
                    h === active ? "bg-lime-300 text-emerald-950 border-lime-200"
                    : done ? "bg-emerald-800/70 text-lime-200 border-lime-200/25"
                    : "bg-emerald-950/60 text-amber-50/50 border-lime-200/10"
                  }`}>{h}</button>
              );
            })}
          </div>

          <div className="golf-card rounded-2xl p-5 mt-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setActive(numbers[(numbers.indexOf(active) - 1 + numbers.length) % numbers.length])}
                className="w-9 h-9 rounded-full bg-emerald-950/60 border border-lime-200/15 flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-amber-50/80" />
              </button>
              <div className="text-center">
                <p className="text-amber-50/60 text-xs uppercase tracking-wider">Hole</p>
                <p className="text-white font-display font-bold text-4xl leading-none">{active}</p>
                <p className="text-lime-300 text-sm mt-1">Par {par}</p>
                {alreadyRecorded && (
                  <span className="inline-block mt-1.5 text-[10px] bg-lime-300/20 text-lime-200 px-2 py-0.5 rounded-full">Already recorded</span>
                )}
              </div>
              <button onClick={() => setActive(numbers[(numbers.indexOf(active) + 1) % numbers.length])}
                className="w-9 h-9 rounded-full bg-emerald-950/60 border border-lime-200/15 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-amber-50/80" />
              </button>
            </div>

            <Counter label="Strokes" value={strokes} onChange={setStrokes} max={30} big />
            <div className="flex gap-1.5 justify-center mt-2.5 flex-wrap">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} onClick={() => setStrokes(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border transition ${
                    strokes === n ? "bg-lime-300 text-emerald-950 border-lime-200" : "bg-emerald-950/60 text-amber-50/70 border-lime-200/12"
                  }`}>{n}</button>
              ))}
            </div>

            <Counter label="Penalties" value={penalties} onChange={setPenalties} max={15} accent />

            <div className="mt-4 flex items-center justify-between bg-emerald-950/60 rounded-xl px-4 py-3 border border-lime-200/10">
              <span className="text-amber-50/70 text-sm">Hole total</span>
              <span className="text-white font-bold text-lg">
                {strokes + penalties}
                {strokes > 0 && (
                  <span className={`ml-2 text-sm ${
                    strokes + penalties - par > 0 ? "text-rose-300" : strokes + penalties - par < 0 ? "text-lime-300" : "text-amber-50/70"
                  }`}>{formatToPar(strokes + penalties - par)}</span>
                )}
              </span>
            </div>

            <button onClick={commit} disabled={strokes <= 0}
              className="w-full mt-4 py-3.5 rounded-xl font-bold text-emerald-950 bg-lime-300 disabled:opacity-40 transition">
              {alreadyRecorded ? "Update Hole" : "Save Hole"}
            </button>
          </div>

          {/* Running card */}
          <div className="golf-card rounded-2xl p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">{team?.name}</h3>
              <span className="text-lime-300 font-bold text-sm">{teamLine(team, holes, cards)}</span>
            </div>
            <div className="grid grid-cols-9 gap-1">
              {numbers.map((h) => {
                const s = scoreMap[h];
                const val = s?.strokes > 0 ? s.strokes + (s.penalties || 0) + holeAdjustment(team, h, cards, holes) : null;
                const d = val != null ? val - parFor(holes, h) : null;
                return (
                  <button key={h} onClick={() => setActive(h)}
                    className={`rounded-md py-1.5 text-center border ${h === active ? "border-lime-300 bg-lime-300/15" : "border-lime-200/10 bg-emerald-950/40"}`}>
                    <span className="block text-[9px] text-amber-50/45">{h}</span>
                    <span className={`block text-sm font-bold ${
                      d == null ? "text-amber-50/25" : d > 0 ? "text-rose-300" : d < 0 ? "text-lime-300" : "text-white"
                    }`}>{val ?? "·"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-2">
          {ranked.map((t, i) => (
            <div key={t.id} className={`golf-card rounded-2xl px-4 py-3.5 flex items-center gap-3 ${t.id === teamId ? "ring-2 ring-lime-300/40" : ""}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                i === 0 && t.totals.played ? "bg-lime-300 text-emerald-950" : "bg-emerald-950/70 text-amber-50/70 border border-lime-200/15"
              }`}>{t.totals.played ? i + 1 : "–"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{t.name}</p>
                <p className="text-amber-50/55 text-xs truncate">{(t.players || []).join(" · ")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-display font-bold text-xl leading-none ${
                  t.totals.toPar < 0 ? "text-lime-300" : t.totals.toPar > 0 ? "text-rose-300" : "text-white"
                }`}>{t.totals.played ? formatToPar(t.totals.toPar) : "—"}</p>
                <p className="text-amber-50/50 text-[11px] mt-0.5">{t.totals.played} holes</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {review && (
        <HoleReviewModal
          hole={review.hole}
          granted={review.granted}
          strokes={strokes}
          penalties={penalties}
          wonChallenge={(team?.challenge_wins || []).some((w) => w.hole_number === review.hole)}
          tag={null}
          cards={cards}
          ledger={team?.power_up_uses || []}
          holes={holes}
          localHandlers={{
            setCards: (sel) => {
              const res = setHoleCards(round, teamId, review.hole, sel);
              if (res.ok) setRound(res.round);
              return res;
            },
            setChallenge: (won) => setRound(setChallengeWinLocal(round, teamId, review.hole, won)),
          }}
          onDone={closeReview}
          onSkip={closeReview}
        />
      )}

      {showRules && <GameRules mode={mode} onClose={() => setShowRules(false)} />}
      {showSummary && (
        <RoundSummary state={state} myTeamId={teamId} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}

function teamLine(team, holes, cards) {
  let total = 0, parTotal = 0;
  for (const s of team?.scores || []) {
    if (!(s.strokes > 0)) continue;
    total += s.strokes + (s.penalties || 0) + holeAdjustment(team, s.hole_number, cards, holes);
    parTotal += parFor(holes, s.hole_number);
  }
  return total > 0 ? `${total} (${formatToPar(total - parTotal)})` : "—";
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
        active ? "bg-lime-300 text-emerald-950" : "text-amber-50/60"
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function Counter({ label, value, onChange, max, big, accent }) {
  return (
    <div className="mt-4">
      <p className="text-amber-50/70 text-xs uppercase tracking-wider text-center mb-2">{label}</p>
      <div className="flex items-center justify-center gap-5">
        <button onClick={() => onChange(Math.max(0, value - 1))}
          className="w-12 h-12 rounded-full bg-emerald-950/70 border border-lime-200/20 flex items-center justify-center active:scale-95">
          <Minus className="w-5 h-5 text-amber-50/85" />
        </button>
        <span className={`font-display font-bold tabular-nums ${big ? "text-5xl" : "text-3xl"} ${accent ? "text-rose-300" : "text-white"} min-w-[2.5rem] text-center`}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-12 h-12 rounded-full bg-lime-300/90 flex items-center justify-center active:scale-95">
          <Plus className="w-5 h-5 text-emerald-950" />
        </button>
      </div>
    </div>
  );
}
