"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, Trash2, Play, Plus, Flag, CheckCircle2, Clock } from "lucide-react";
import { listRounds, deleteRound, cardsForRound } from "@/lib/casualRound";
import { rankTeams, formatToPar } from "@/lib/tournament";
import { modeById } from "@/lib/gameModes";

export default function RoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState([]);
  const [ready, setReady] = useState(false);

  const reload = () => setRounds(listRounds());
  useEffect(() => { reload(); setReady(true); }, []);

  const remove = (r) => {
    if (!confirm(`Delete this round at ${r.course || "the course"}? This can't be undone.`)) return;
    deleteRound(r.id);
    reload();
  };

  return (
    <div className="px-4 py-5 pb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-white font-display font-bold text-2xl flex items-center gap-2">
            <Flag className="w-6 h-6 text-lime-300" /> My Rounds
          </h1>
          <p className="text-amber-50/60 text-sm mt-0.5">Rounds you've played on this phone.</p>
        </div>
      </div>

      <Link href="/golf/play"
        className="w-full mb-4 py-3.5 rounded-xl bg-lime-300 text-emerald-950 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition">
        <Plus className="w-4 h-4" /> Start a new round
      </Link>

      {!ready ? null : rounds.length === 0 ? (
        <div className="golf-card rounded-2xl py-16 text-center">
          <Trophy className="w-10 h-10 text-amber-50/20 mx-auto mb-2" />
          <p className="text-amber-50/70 text-sm font-semibold">No rounds yet</p>
          <p className="text-amber-50/45 text-xs mt-1">Start one above and it'll be saved here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((r) => {
            const mode = modeById(r.modeId);
            const cards = cardsForRound(r);
            const ranked = rankTeams(r.teams, r.holes, cards);
            const winner = ranked[0];
            const done = r.status === "complete";
            const played = Math.max(...r.teams.map((t) => (t.scores || []).filter((s) => s.strokes > 0).length), 0);

            return (
              <div key={r.id} className="golf-card rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-emerald-950/60 flex items-center justify-center text-2xl shrink-0">
                    {mode.icon}
                  </span>

                  <button onClick={() => router.push(`/golf/play?id=${r.id}`)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold truncate">{r.course || mode.short}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        done ? "bg-lime-300/20 text-lime-300" : "bg-amber-300/15 text-amber-200"
                      }`}>
                        {done ? <><CheckCircle2 className="w-2.5 h-2.5" /> complete</> : <><Clock className="w-2.5 h-2.5" /> in progress</>}
                      </span>
                    </div>
                    <p className="text-amber-50/55 text-xs mt-0.5">
                      {mode.short} · {r.holesCount} holes · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-amber-50/45 text-[11px] mt-0.5">
                      {r.teams.length} {mode.teamBased ? "teams" : "players"} · {played}/{r.holes.length} holes played
                    </p>

                    {done && winner?.totals?.played > 0 && (
                      <p className="text-lime-300 text-xs mt-1.5 font-semibold">
                        🏆 {winner.name} — {formatToPar(winner.totals.toPar)}
                      </p>
                    )}
                  </button>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => router.push(`/golf/play?id=${r.id}`)}
                      className="p-2 rounded-lg bg-lime-300/15 text-lime-300 border border-lime-300/25">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(r)} className="p-2 rounded-lg text-amber-50/40 hover:text-rose-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-amber-50/35 text-[11px] text-center mt-5 leading-relaxed">
        Rounds are stored on this device only. Clearing your browser data will remove them.
      </p>
    </div>
  );
}
