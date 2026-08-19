"use client";
import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, X, Users, Flag, Play, Lock } from "lucide-react";
import { GAME_MODES, modeById } from "@/lib/gameModes";
import { holeNumbersFor } from "@/lib/casualRound";
import { colorOf } from "@/lib/powerUpStyles";

/**
 * Three-step setup: mode, round shape + pars, players.
 * Rules and cards are fixed by the mode — nothing here changes how the game
 * is played, so every group is on the same version.
 */
export default function CasualSetup({ onStart, onCancel }) {
  const [step, setStep] = useState(0);
  const [modeId, setModeId] = useState("scramble2v2");
  const [shape, setShape] = useState("18");
  const [course, setCourse] = useState("");
  const [pars, setPars] = useState({});
  const [teams, setTeams] = useState([
    { id: "t1", name: "Team 1", players: ["", ""] },
    { id: "t2", name: "Team 2", players: ["", ""] },
  ]);

  const mode = modeById(modeId);
  const holesCount = shape === "18" ? 18 : 9;
  const side = shape === "back9" ? "back" : shape === "front9" ? "front" : null;
  const numbers = holeNumbersFor(holesCount, side);

  const pickMode = (id) => {
    setModeId(id);
    const m = modeById(id);
    setTeams(
      m.teamBased
        ? [{ id: "t1", name: "Team 1", players: ["", ""] }, { id: "t2", name: "Team 2", players: ["", ""] }]
        : [{ id: "t1", name: "", players: [""] }, { id: "t2", name: "", players: [""] }]
    );
  };

  const addTeam = () => {
    if (teams.length >= mode.maxTeams) return;
    const n = teams.length + 1;
    setTeams([...teams, {
      id: `t${n}`,
      name: mode.teamBased ? `Team ${n}` : "",
      players: mode.teamBased ? ["", ""] : [""],
    }]);
  };
  const removeTeam = (i) => setTeams(teams.filter((_, x) => x !== i));
  const setPlayer = (ti, pi, v) =>
    setTeams(teams.map((t, i) => i === ti ? { ...t, players: t.players.map((p, x) => x === pi ? v : p) } : t));
  const setTeamName = (ti, v) => setTeams(teams.map((t, i) => i === ti ? { ...t, name: v } : t));

  const cleanTeams = teams
    .map((t, i) => ({
      ...t,
      players: t.players.map((p) => p.trim()).filter(Boolean),
      name: (t.name || "").trim() || (mode.teamBased ? `Team ${i + 1}` : t.players[0]?.trim() || `Player ${i + 1}`),
    }))
    .filter((t) => t.players.length > 0);

  const canStart = cleanTeams.length >= mode.minTeams;

  const start = () => onStart({ modeId, course: course.trim(), holesCount, side, teams: cleanTeams, pars });

  return (
    <div className="px-4 py-4 pb-8">
      {/* Steps */}
      <div className="flex items-center gap-1.5 mb-4">
        {["Game", "Course", "Players"].map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? "bg-lime-300" : "bg-emerald-950/70"}`} />
            <p className={`text-[10px] mt-1 ${i <= step ? "text-lime-300" : "text-amber-50/40"}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Step 1: mode ── */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-display font-bold text-xl">Pick your game</h2>
          {GAME_MODES.map((m) => {
            const c = colorOf(m.accent);
            const on = modeId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => pickMode(m.id)}
                className={`w-full text-left rounded-2xl border p-4 transition ${on ? `${c.ring} ${c.tint} ${c.glow}` : "border-lime-200/12 bg-emerald-950/45"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-emerald-950/60 flex items-center justify-center text-2xl shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-bold">{m.name}</p>
                    <p className={`text-[11px] ${c.text}`}>{m.tagline}</p>
                    <p className="text-amber-50/70 text-xs mt-1.5 leading-relaxed">{m.blurb}</p>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="golf-card rounded-xl px-3.5 py-3 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-lime-300 shrink-0 mt-0.5" />
            <p className="text-amber-50/70 text-xs leading-relaxed">
              Rules and power-ups are fixed for each game so every group plays the same way.
              You only set the course and who's playing.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 2: course ── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-white font-display font-bold text-xl">The course</h2>

          <div>
            <label className="block text-amber-50/70 text-xs mb-1.5">Course name (optional)</label>
            <input
              value={course} onChange={(e) => setCourse(e.target.value)}
              placeholder="Roseland Golf Course"
              className="w-full bg-emerald-950/70 border border-lime-200/20 rounded-xl px-3.5 py-3 text-white placeholder-amber-50/30 outline-none focus:border-lime-300/50"
            />
          </div>

          <div>
            <label className="block text-amber-50/70 text-xs mb-1.5">How many holes?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "18", label: "18", sub: "Full round" },
                { id: "front9", label: "Front 9", sub: "1-9" },
                { id: "back9", label: "Back 9", sub: "10-18" },
              ].map((o) => (
                <button key={o.id} onClick={() => setShape(o.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition ${
                    shape === o.id ? "bg-lime-300 border-lime-200 text-emerald-950" : "bg-emerald-950/55 border-lime-200/12 text-amber-50/70"
                  }`}>
                  <span className="block text-sm font-bold">{o.label}</span>
                  <span className="block text-[10px] opacity-80">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-amber-50/70 text-xs mb-1.5">
              Par for each hole <span className="text-amber-50/40">— defaults to 4</span>
            </label>
            <div className="space-y-1.5">
              {numbers.map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-lime-200/12 text-amber-50/80 text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
                  <div className="flex gap-1.5">
                    {[3, 4, 5].map((p) => (
                      <button key={p} onClick={() => setPars({ ...pars, [n]: p })}
                        className={`w-11 h-8 rounded-lg text-xs font-bold border transition ${
                          (pars[n] ?? 4) === p ? "bg-lime-300 text-emerald-950 border-lime-200" : "bg-emerald-950/55 text-amber-50/60 border-lime-200/12"
                        }`}>{p}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: players ── */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-white font-display font-bold text-xl">Who's playing?</h2>
          <p className="text-amber-50/60 text-xs">
            {mode.teamBased
              ? "Two players per team. Scores are recorded per team."
              : "One card each. Add everyone in your group."}
          </p>

          {teams.map((t, ti) => (
            <div key={t.id} className="golf-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                {mode.teamBased ? (
                  <input
                    value={t.name} onChange={(e) => setTeamName(ti, e.target.value)}
                    className="flex-1 bg-transparent text-white font-bold outline-none border-b border-transparent focus:border-lime-300/40"
                  />
                ) : (
                  <span className="text-white font-bold flex-1">Player {ti + 1}</span>
                )}
                {teams.length > mode.minTeams && (
                  <button onClick={() => removeTeam(ti)} className="text-amber-50/40 hover:text-rose-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {t.players.map((p, pi) => (
                  <input
                    key={pi}
                    value={p} onChange={(e) => setPlayer(ti, pi, e.target.value)}
                    placeholder={mode.teamBased ? `Player ${pi + 1}` : "Name"}
                    className="w-full bg-emerald-950/70 border border-lime-200/15 rounded-lg px-3 py-2.5 text-white text-sm placeholder-amber-50/25 outline-none focus:border-lime-300/45"
                  />
                ))}
              </div>
            </div>
          ))}

          {teams.length < mode.maxTeams && (
            <button onClick={addTeam}
              className="w-full py-3 rounded-xl border border-dashed border-lime-200/25 text-amber-50/70 text-sm flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Add {mode.teamBased ? "team" : "player"}
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
          className="px-4 py-3 rounded-xl text-sm font-medium text-amber-50/70 bg-emerald-950/60 border border-lime-200/12 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < 2 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex-1 py-3 rounded-xl font-bold text-emerald-950 bg-lime-300 flex items-center justify-center gap-2">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={start} disabled={!canStart}
            className="flex-1 py-3 rounded-xl font-bold text-emerald-950 bg-lime-300 disabled:opacity-40 flex items-center justify-center gap-2">
            <Play className="w-4 h-4" /> Start round
          </button>
        )}
      </div>
    </div>
  );
}
