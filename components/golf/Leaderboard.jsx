"use client";
import { useMemo, useState } from "react";
import { Trophy, Radio, ChevronDown, Zap } from "lucide-react";
import { rankTeams, formatToPar, parFor } from "@/lib/tournament";

export default function Leaderboard({ state, myTeamId, lastUpdate }) {
  const holes = state?.holes || [];
  const teams = state?.teams || [];
  const powerUps = state?.power_ups || [];
  const [flight, setFlight] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const flights = useMemo(() => {
    const set = new Set(teams.map((t) => t.flight).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [teams]);

  const ranked = useMemo(() => {
    const pool = flight === "all" ? teams : teams.filter((t) => t.flight === flight);
    return rankTeams(pool, holes);
  }, [teams, holes, flight]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold font-display text-xl flex items-center gap-2">
          <Trophy className="w-5 h-5 text-lime-300" /> Live Board
        </h2>
        <span className="flex items-center gap-1.5 text-lime-300/90 text-[11px]">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Live"}
        </span>
      </div>

      {flights.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
          {flights.map((f) => (
            <button
              key={f}
              onClick={() => setFlight(f)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
                flight === f
                  ? "bg-lime-300 text-emerald-950 border-lime-200"
                  : "bg-emerald-950/50 text-amber-50/70 border-lime-200/15"
              }`}
            >
              {f === "all" ? "All flights" : `Flight ${f}`}
            </button>
          ))}
        </div>
      )}

      {ranked.length === 0 ? (
        <div className="golf-card rounded-2xl py-14 text-center">
          <Trophy className="w-10 h-10 text-amber-50/20 mx-auto mb-2" />
          <p className="text-amber-50/60 text-sm">No teams yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((t, i) => {
            const mine = t.id === myTeamId;
            const open = expanded === t.id;
            const started = t.totals.played > 0;
            return (
              <div
                key={t.id}
                className={`rounded-2xl overflow-hidden transition ${
                  mine ? "golf-card ring-2 ring-lime-300/50" : "golf-card"
                }`}
              >
                <button onClick={() => setExpanded(open ? null : t.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                    i === 0 && started ? "bg-lime-300 text-emerald-950" : "bg-emerald-950/70 text-amber-50/70 border border-lime-200/15"
                  }`}>
                    {started ? i + 1 : "–"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold truncate">{t.name}</p>
                      {mine && <span className="text-[10px] bg-lime-300/20 text-lime-300 px-1.5 py-0.5 rounded shrink-0">you</span>}
                    </div>
                    <p className="text-amber-50/55 text-xs truncate">
                      {(t.players || []).join(" · ") || "—"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-display font-bold text-xl leading-none ${
                      t.totals.toPar < 0 ? "text-lime-300" : t.totals.toPar > 0 ? "text-rose-300" : "text-white"
                    }`}>
                      {started ? formatToPar(t.totals.toPar) : "—"}
                    </p>
                    <p className="text-amber-50/50 text-[11px] mt-0.5">
                      {started ? `${t.totals.played} hole${t.totals.played === 1 ? "" : "s"}` : "Not started"}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-amber-50/40 shrink-0 transition ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-4 pb-4 -mt-1">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Mini label="Strokes" value={t.totals.strokes} />
                      <Mini label="Penalties" value={t.totals.penalties} accent={t.totals.penalties > 0} />
                      <Mini label="Total" value={t.totals.total} />
                    </div>

                    {/* per-hole strip */}
                    <div className="grid grid-cols-9 gap-1">
                      {(holes.length ? holes.map((h) => h.hole_number) : []).map((h) => {
                        const s = (t.scores || []).find((x) => x.hole_number === h);
                        const val = s?.strokes > 0 ? s.strokes + (s.penalties || 0) : null;
                        const d = val != null ? val - parFor(holes, h) : null;
                        return (
                          <div key={h} className="rounded-md py-1 text-center bg-emerald-950/50 border border-lime-200/10">
                            <span className="block text-[9px] text-amber-50/40">{h}</span>
                            <span className={`block text-xs font-bold ${
                              d == null ? "text-amber-50/25" : d > 0 ? "text-rose-300" : d < 0 ? "text-lime-300" : "text-white"
                            }`}>{val ?? "·"}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* power-ups this team has spent */}
                    {(t.power_up_uses || []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-amber-50/55 text-[11px] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Power-ups used
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(t.power_up_uses || []).map((u) => {
                            const pu = powerUps.find((p) => p.id === u.power_up_id);
                            return (
                              <span key={u.id} className="text-[11px] bg-emerald-950/70 border border-lime-200/15 text-amber-50/85 px-2 py-1 rounded-full">
                                {pu?.icon ? `${pu.icon} ` : ""}{pu?.name || "Power-up"}
                                {u.hole_number ? ` · #${u.hole_number}` : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div className="bg-emerald-950/55 rounded-lg px-2.5 py-2 border border-lime-200/10 text-center">
      <p className="text-amber-50/50 text-[10px] uppercase tracking-wide">{label}</p>
      <p className={`font-bold text-sm mt-0.5 ${accent ? "text-rose-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
