"use client";
import { useState, useMemo } from "react";
import { Zap, Check, Loader2, Undo2, Users } from "lucide-react";
import { usePowerUp, undoPowerUp } from "@/lib/tournament";

export default function PowerUps({ round, state, myTeamId, onChanged }) {
  const tag = round?.player?.bag_tag;
  const powerUps = state?.power_ups || round?.power_ups || [];
  const teams = state?.teams || [];
  const holes = round?.holes || [];
  const holeCount = holes.length || round?.tournament?.holes_count || 18;

  const myTeam = teams.find((t) => t.id === myTeamId);
  const myUses = myTeam?.power_up_uses || [];

  const [hole, setHole] = useState(round?.team?.starting_hole || 1);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const usedCount = useMemo(() => {
    const m = {};
    for (const u of myUses) m[u.power_up_id] = (m[u.power_up_id] || 0) + 1;
    return m;
  }, [myUses]);

  const spend = async (pu) => {
    setBusy(pu.id); setError("");
    const res = await usePowerUp(tag, pu.id, hole);
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

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold font-display text-xl flex items-center gap-2">
          <Zap className="w-5 h-5 text-lime-300" /> Power-Ups
        </h2>
      </div>

      {powerUps.length === 0 ? (
        <div className="golf-card rounded-2xl py-14 text-center">
          <Zap className="w-10 h-10 text-amber-50/20 mx-auto mb-2" />
          <p className="text-amber-50/60 text-sm">No power-ups set for this tournament.</p>
        </div>
      ) : (
        <>
          {/* Which hole are you spending it on */}
          <div className="golf-card rounded-2xl p-4">
            <p className="text-amber-50/70 text-xs uppercase tracking-wider mb-2">Using on hole</p>
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

          {error && <p className="text-rose-300 text-sm px-1">{error}</p>}

          {/* Your team's power-ups */}
          <div className="space-y-2">
            {powerUps.map((pu) => {
              const used = usedCount[pu.id] || 0;
              const left = Math.max(0, (pu.uses_per_team || 1) - used);
              const mine = myUses.filter((u) => u.power_up_id === pu.id);
              return (
                <div key={pu.id} className="golf-card rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-lime-300/15 border border-lime-300/30 flex items-center justify-center shrink-0 text-xl">
                      {pu.icon || "⚡"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white font-bold">{pu.name}</p>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                          left > 0 ? "bg-lime-300/20 text-lime-300" : "bg-stone-700/60 text-amber-50/50"
                        }`}>
                          {left > 0 ? `${left} left` : "Used"}
                        </span>
                      </div>
                      {pu.description && (
                        <p className="text-amber-50/70 text-xs mt-1 leading-relaxed">{pu.description}</p>
                      )}

                      {mine.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mine.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => undo(u.id)}
                              disabled={busy === u.id}
                              className="text-[11px] bg-emerald-950/70 border border-lime-200/15 text-amber-50/80 px-2 py-1 rounded-full flex items-center gap-1 hover:border-rose-300/40 transition"
                            >
                              {busy === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                              Hole {u.hole_number || "?"}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => spend(pu)}
                        disabled={left === 0 || busy === pu.id}
                        className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-emerald-950 bg-lime-300 hover:bg-lime-200 disabled:bg-stone-700/50 disabled:text-amber-50/40 transition flex items-center justify-center gap-2"
                      >
                        {busy === pu.id ? <Loader2 className="w-4 h-4 animate-spin" />
                          : left === 0 ? <><Check className="w-4 h-4" /> All used</>
                          : `Use on hole ${hole}`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* What everyone else has spent */}
          <div className="golf-card rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-lime-300" /> Around the Course
            </h3>
            <div className="space-y-2.5">
              {teams.filter((t) => t.id !== myTeamId).map((t) => {
                const uses = t.power_up_uses || [];
                return (
                  <div key={t.id} className="flex items-start justify-between gap-3">
                    <p className="text-amber-50/85 text-sm min-w-0 truncate">{t.name}</p>
                    {uses.length === 0 ? (
                      <span className="text-amber-50/35 text-xs shrink-0">none used</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 justify-end shrink-0 max-w-[60%]">
                        {uses.map((u) => {
                          const pu = powerUps.find((p) => p.id === u.power_up_id);
                          return (
                            <span key={u.id} className="text-[10px] bg-emerald-950/70 border border-lime-200/15 text-amber-50/75 px-1.5 py-0.5 rounded-full">
                              {pu?.icon || "⚡"} {pu?.name}{u.hole_number ? ` #${u.hole_number}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {teams.length <= 1 && <p className="text-amber-50/40 text-xs">No other teams yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
