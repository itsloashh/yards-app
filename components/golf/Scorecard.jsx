"use client";
import { useState, useEffect, useMemo } from "react";
import { Minus, Plus, Check, Loader2, CloudOff, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { saveScore, parFor, formatToPar, holeAdjustment } from "@/lib/tournament";
import HoleReviewModal from "@/components/golf/HoleReviewModal";

export default function Scorecard({ round, liveTeam, cards = [], onSaved }) {
  const { team, holes = [], player } = round;
  const tag = player?.bag_tag;
  const holeCount = holes.length || round.tournament?.holes_count || 18;
  const holeNumbers = holes.length
    ? holes.map((h) => h.hole_number)
    : Array.from({ length: holeCount }, (_, i) => i + 1);
  const startHole = team?.starting_hole || holeNumbers[0] || 1;

  const [active, setActive] = useState(startHole);
  const [strokes, setStrokes] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [status, setStatus] = useState("");   // "", saving, saved, queued, error
  const [message, setMessage] = useState("");
  const [review, setReview] = useState(null); // { hole, granted }

  // Scores already recorded for this team (from the live feed)
  const scoreMap = useMemo(() => {
    const m = {};
    for (const s of liveTeam?.scores || []) m[s.hole_number] = s;
    return m;
  }, [liveTeam]);

  // Load whatever is stored whenever we move holes
  useEffect(() => {
    const s = scoreMap[active];
    setStrokes(s?.strokes ?? 0);
    setPenalties(s?.penalties ?? 0);
    setStatus("");
    setMessage("");
  }, [active, scoreMap]);

  const par = parFor(holes, active);
  const holeInfo = holes.find((h) => h.hole_number === active);

  // Where "Save" sends them next: the following hole in play order, skipping
  // any already filled in, so a group can't land back on the same hole twice.
  const nextHole = useMemo(() => {
    const list = holeNumbers;
    const i = list.indexOf(active);
    for (let step = 1; step <= list.length; step++) {
      const h = list[(i + step) % list.length];
      if (!(scoreMap[h]?.strokes > 0)) return h;
    }
    return list[(i + 1) % list.length];
  }, [active, holeNumbers, scoreMap]);

  const commit = async () => {
    if (strokes <= 0) { setStatus("error"); setMessage("Enter at least 1 stroke"); return; }
    setStatus("saving");
    const res = await saveScore({ tag, hole: active, strokes, penalties });
    if (res.ok) {
      setStatus("saved");
      setMessage("");
      onSaved?.();
      // Review step: shows anything the score earned and lets the group log
      // what they used here. Advancing waits until it's closed so the hole
      // in the modal always matches the hole they just played.
      setReview({ hole: active, granted: res.granted || [], strokes, penalties });
    } else if (res.queued) {
      setStatus("queued");
      setMessage(res.error);
    } else {
      setStatus("error");
      setMessage(res.error || "Could not save");
    }
  };

  const closeReview = () => {
    const done = review?.hole;
    setReview(null);
    onSaved?.();
    if (done === active) setActive(nextHole);
  };

  const holeTotal = strokes + penalties;
  const diff = holeTotal - par;
  const alreadyRecorded = (scoreMap[active]?.strokes ?? 0) > 0;

  return (
    <div className="px-4 py-4">
      {/* Hole selector strip */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {holeNumbers.map((h) => {
          const done = scoreMap[h]?.strokes > 0;
          const isActive = h === active;
          return (
            <button
              key={h}
              onClick={() => setActive(h)}
              className={`shrink-0 w-10 h-10 rounded-lg text-sm font-bold transition border ${
                isActive
                  ? "bg-lime-300 text-emerald-950 border-lime-200"
                  : done
                  ? "bg-emerald-800/70 text-lime-200 border-lime-200/25"
                  : "bg-emerald-950/60 text-amber-50/50 border-lime-200/10"
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>

      {/* Active hole */}
      <div className="golf-card rounded-2xl p-5 mt-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setActive((h) => holeNumbers[(holeNumbers.indexOf(h) - 1 + holeNumbers.length) % holeNumbers.length])} className="w-9 h-9 rounded-full bg-emerald-950/60 border border-lime-200/15 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-amber-50/80" />
          </button>
          <div className="text-center">
            <p className="text-amber-50/60 text-xs uppercase tracking-wider">Hole</p>
            <p className="text-white font-display font-bold text-4xl leading-none">{active}</p>
            <p className="text-lime-300 text-sm mt-1">Par {par}</p>
            {alreadyRecorded && (
              <span className="inline-block mt-1.5 text-[10px] bg-lime-300/20 text-lime-200 px-2 py-0.5 rounded-full">
                Already recorded
              </span>
            )}
          </div>
          <button onClick={() => setActive((h) => holeNumbers[(holeNumbers.indexOf(h) + 1) % holeNumbers.length])} className="w-9 h-9 rounded-full bg-emerald-950/60 border border-lime-200/15 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-amber-50/80" />
          </button>
        </div>

        {holeInfo?.is_jackpot && (
          <div className="mt-3 bg-amber-300/15 border border-amber-300/40 rounded-xl px-3 py-2 text-center">
            <p className="text-amber-200 text-xs font-bold uppercase tracking-wide">💰 Jackpot hole</p>
            <p className="text-amber-50/85 text-[11px] mt-0.5">All bonuses count double here</p>
          </div>
        )}

        {holeInfo?.challenge && (
          <div className="mt-3 bg-lime-300/12 border border-lime-300/30 rounded-xl px-3 py-2 text-center">
            <p className="text-lime-200 text-xs font-semibold uppercase tracking-wide">Challenge hole</p>
            <p className="text-white text-sm mt-0.5">{holeInfo.challenge}</p>
            {holeInfo.challenge_reward && (
              <p className="text-lime-300/90 text-[11px] mt-1">🎁 {holeInfo.challenge_reward}</p>
            )}
          </div>
        )}

        {/* Strokes */}
        <Counter label="Strokes" value={strokes} onChange={setStrokes} min={0} max={20} big />

        {/* Penalties */}
        <Counter label="Penalties" value={penalties} onChange={setPenalties} min={0} max={10} accent="rose" />

        {/* Hole result */}
        <div className="mt-4 flex items-center justify-between bg-emerald-950/60 rounded-xl px-4 py-3 border border-lime-200/10">
          <span className="text-amber-50/70 text-sm">Hole total</span>
          <span className="text-white font-bold text-lg">
            {holeTotal}
            {strokes > 0 && (
              <span className={`ml-2 text-sm font-semibold ${diff > 0 ? "text-rose-300" : diff < 0 ? "text-lime-300" : "text-amber-50/70"}`}>
                {formatToPar(diff)}
              </span>
            )}
          </span>
        </div>

        <button
          onClick={commit}
          disabled={status === "saving"}
          className="w-full mt-4 py-3.5 rounded-xl font-bold text-emerald-950 bg-lime-300 hover:bg-lime-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {status === "saving" ? <Loader2 className="w-5 h-5 animate-spin" />
            : status === "saved" ? <><Check className="w-5 h-5" /> Saved</>
            : "Save Hole"}
        </button>

        {status === "queued" && (
          <p className="text-amber-200 text-xs mt-2.5 flex items-center gap-1.5 justify-center">
            <CloudOff className="w-3.5 h-3.5" /> {message}
          </p>
        )}
        {status === "error" && (
          <p className="text-rose-300 text-xs mt-2.5 flex items-center gap-1.5 justify-center">
            <AlertTriangle className="w-3.5 h-3.5" /> {message}
          </p>
        )}
      </div>

      {/* Running card */}
      <RunningCard scoreMap={scoreMap} holes={holes} holeCount={holeCount} onPick={setActive} active={active} team={liveTeam} cards={cards} />

      {review && (
        <HoleReviewModal
          hole={review.hole}
          granted={review.granted}
          strokes={review.strokes}
          penalties={review.penalties}
          tag={tag}
          cards={cards}
          ledger={liveTeam?.power_up_uses || []}
          holes={holes}
          onDone={closeReview}
          onSkip={closeReview}
        />
      )}
    </div>
  );
}

function Counter({ label, value, onChange, min = 0, max = 20, big, accent }) {
  const tint = accent === "rose" ? "text-rose-300" : "text-white";
  return (
    <div className="mt-4">
      <p className="text-amber-50/70 text-xs uppercase tracking-wider text-center mb-2">{label}</p>
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-12 h-12 rounded-full bg-emerald-950/70 border border-lime-200/20 flex items-center justify-center active:scale-95 transition"
        >
          <Minus className="w-5 h-5 text-amber-50/85" />
        </button>
        <span className={`font-display font-bold tabular-nums ${big ? "text-5xl" : "text-3xl"} ${tint} min-w-[2.5rem] text-center`}>
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-12 h-12 rounded-full bg-lime-300/90 flex items-center justify-center active:scale-95 transition"
        >
          <Plus className="w-5 h-5 text-emerald-950" />
        </button>
      </div>
    </div>
  );
}

function RunningCard({ scoreMap, holes, holeCount, onPick, active, team, cards }) {
  const rows = holes.length ? holes.map((h) => h.hole_number) : Array.from({ length: holeCount }, (_, i) => i + 1);
  let total = 0, parTotal = 0;
  for (const h of rows) {
    const s = scoreMap[h];
    if (s?.strokes > 0) {
      total += s.strokes + (s.penalties || 0) + holeAdjustment(team, h, cards, holes);
      parTotal += parFor(holes, h);
    }
  }

  return (
    <div className="golf-card rounded-2xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Your Card</h3>
        <span className="text-lime-300 font-bold text-sm">
          {total > 0 ? `${total} (${formatToPar(total - parTotal)})` : "—"}
        </span>
      </div>
      <div className="grid grid-cols-9 gap-1">
        {rows.map((h) => {
          const s = scoreMap[h];
          const val = s?.strokes > 0 ? s.strokes + (s.penalties || 0) + holeAdjustment(team, h, cards, holes) : null;
          const d = val != null ? val - parFor(holes, h) : null;
          return (
            <button
              key={h}
              onClick={() => onPick(h)}
              className={`rounded-md py-1.5 text-center border transition ${
                h === active ? "border-lime-300 bg-lime-300/15" : "border-lime-200/10 bg-emerald-950/40"
              }`}
            >
              <span className="block text-[9px] text-amber-50/45">{h}</span>
              <span className={`block text-sm font-bold ${
                d == null ? "text-amber-50/25" : d > 0 ? "text-rose-300" : d < 0 ? "text-lime-300" : "text-white"
              }`}>
                {val ?? "·"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
