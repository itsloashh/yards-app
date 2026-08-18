"use client";
import { useState } from "react";
import { Loader2, Info, ClipboardList, Trophy, Zap, LogOut, CloudOff } from "lucide-react";
import { useRound, useLiveTournament, useQueueSync } from "@/lib/tournament";
import TagSignIn from "@/components/golf/TagSignIn";
import RoundInfo from "@/components/golf/RoundInfo";
import Scorecard from "@/components/golf/Scorecard";
import Leaderboard from "@/components/golf/Leaderboard";
import PowerUps from "@/components/golf/PowerUps";

const TABS = [
  { id: "info", label: "Round", icon: Info },
  { id: "card", label: "Scorecard", icon: ClipboardList },
  { id: "board", label: "Live", icon: Trophy },
  { id: "power", label: "Power-Ups", icon: Zap },
];

export default function TournamentPage() {
  const { round, loading, error, load, signOut } = useRound();
  const [tab, setTab] = useState("info");
  const pending = useQueueSync();

  const tournamentId = round?.tournament?.id;
  const { state, lastUpdate, refresh } = useLiveTournament(tournamentId);

  const myTeamId = round?.team?.id;
  const liveTeam = state?.teams?.find((t) => t.id === myTeamId);

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

      {tab === "info" && <RoundInfo round={round} state={state} myTeamId={myTeamId} />}
      {tab === "card" && <Scorecard round={round} liveTeam={liveTeam} cards={state?.power_ups || round?.power_ups || []} onSaved={refresh} />}
      {tab === "board" && <Leaderboard state={state} myTeamId={myTeamId} lastUpdate={lastUpdate} />}
      {tab === "power" && <PowerUps round={round} state={state} myTeamId={myTeamId} onChanged={refresh} />}
    </div>
  );
}
