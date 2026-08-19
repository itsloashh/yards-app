"use client";
import { useState, useEffect } from "react";
import { Loader2, Info, ClipboardList, Trophy, Zap, LogOut, CloudOff } from "lucide-react";
import { useRound, useLiveTournament, useQueueSync } from "@/lib/tournament";
import TagSignIn from "@/components/golf/TagSignIn";
import RoundInfo from "@/components/golf/RoundInfo";
import Scorecard from "@/components/golf/Scorecard";
import Leaderboard from "@/components/golf/Leaderboard";
import Inventory from "@/components/golf/Inventory";
import HowToPlay from "@/components/golf/HowToPlay";
import RoundSummary from "@/components/golf/RoundSummary";

const TABS = [
  { id: "info", label: "Round", icon: Info },
  { id: "card", label: "Scorecard", icon: ClipboardList },
  { id: "board", label: "Live", icon: Trophy },
  { id: "power", label: "Inventory", icon: Zap },
];

export default function TournamentPage() {
  const { round, loading, error, load, signOut } = useRound();
  const [tab, setTab] = useState("info");
  const [showRules, setShowRules] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summarySeen, setSummarySeen] = useState(false);
  const pending = useQueueSync();

  const tournamentId = round?.tournament?.id;
  const { state, lastUpdate, refresh } = useLiveTournament(tournamentId);

  const myTeamId = round?.team?.id;
  const liveTeam = state?.teams?.find((t) => t.id === myTeamId);

  // Round is done once every hole has a score. Offer the wrap-up once, then
  // leave it available from the button so it's never in the way.
  const holesTotal = state?.holes?.length || 0;
  const holesDone = (liveTeam?.scores || []).filter((s) => s.strokes > 0).length;
  const roundComplete = holesTotal > 0 && holesDone >= holesTotal;

  useEffect(() => {
    if (roundComplete && !summarySeen) {
      setShowSummary(true);
      setSummarySeen(true);
    }
  }, [roundComplete, summarySeen]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 text-lime-300 animate-spin" />
      </div>
    );
  }

  if (!round) {
    return <TagSignIn onSubmit={(t) => load(t)} error={error} />;
  }

  return (
    <div className="pb-6">
      {/* Player strip */}
      <div className="px-4 pt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{round.player?.name}</p>
          <p className="text-amber-50/55 text-xs truncate">
            {round.team?.name} · Tag #{round.player?.bag_tag}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending > 0 && (
            <span className="flex items-center gap-1 text-amber-200 text-[11px] bg-amber-400/10 border border-amber-300/25 px-2 py-1 rounded-full">
              <CloudOff className="w-3 h-3" /> {pending}
            </span>
          )}
          <button
            onClick={signOut}
            className="text-amber-50/60 hover:text-white text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-lime-200/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-3">
        <div className="flex gap-1 bg-emerald-950/60 border border-lime-200/12 rounded-xl p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-medium transition ${
                  active ? "bg-lime-300 text-emerald-950" : "text-amber-50/60 hover:text-amber-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {roundComplete && (
        <div className="px-4 mt-3">
          <button
            onClick={() => setShowSummary(true)}
            className="w-full py-3 rounded-xl bg-lime-300 text-emerald-950 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Trophy className="w-4 h-4" /> View round summary
          </button>
        </div>
      )}

      {tab === "info" && <RoundInfo round={round} state={state} myTeamId={myTeamId} onShowRules={() => setShowRules(true)} />}
      {tab === "card" && <Scorecard round={round} liveTeam={liveTeam} cards={state?.power_ups || round?.power_ups || []} onSaved={refresh} />}
      {tab === "board" && <Leaderboard state={state} myTeamId={myTeamId} lastUpdate={lastUpdate} />}

      {showRules && <HowToPlay onClose={() => setShowRules(false)} />}
      {showSummary && (
        <RoundSummary state={state} myTeamId={myTeamId} onClose={() => setShowSummary(false)} />
      )}
      {tab === "power" && <Inventory round={round} state={state} myTeamId={myTeamId} />}
    </div>
  );
}
