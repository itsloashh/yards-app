"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, X, Trophy, Check, Users, Zap, Flag, ChevronLeft, Tag as TagIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminPowerUpCard from "@/components/golf/AdminPowerUpCard";
import { isAutoAwarded, CARD_TEMPLATES, templateToRow } from "@/lib/powerUpStyles";
import { scrambleCardRows, SCRAMBLE_META, CHALLENGE_TYPES, challengeTypeById } from "@/lib/scrambleRules";

export default function AdminTournaments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("golf_tournaments").select("*")
      .order("tournament_date", { ascending: false, nullsFirst: false });
    setItems(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const create = async () => {
    const name = prompt("Tournament name?");
    if (!name) return;
    const { data, error } = await supabase.from("golf_tournaments")
      .insert({ name, status: "draft" }).select().single();
    if (error) { alert(error.message); return; }
    await supabase.rpc("golf_seed_holes", { p_tournament_id: data.id, p_holes: 18 });
    reload();
    setOpenId(data.id);
  };

  const remove = async (t) => {
    const typed = prompt(
      `Deleting "${t.name}" removes its teams, bag tags, holes, scores and cards permanently.\n\nType the tournament name to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== t.name.trim()) { alert("Name didn't match — nothing was deleted."); return; }
    const { error } = await supabase.from("golf_tournaments").delete().eq("id", t.id);
    if (error) alert(error.message);
    reload();
  };

  if (openId) return <TournamentEditor id={openId} onBack={() => { setOpenId(null); reload(); }} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-400" /> Tournaments
          </h1>
          <p className="text-stone-400 text-sm mt-1">Set up teams, bag tags, holes and power-ups before the round.</p>
        </div>
        <button onClick={create} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Tournament
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl py-16 text-center">
          <Trophy className="w-10 h-10 text-stone-600 mx-auto mb-2" />
          <p className="text-stone-300 font-semibold">No tournaments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center gap-3 hover:border-stone-700 transition">
              <button onClick={() => setOpenId(t.id)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-stone-100 font-semibold truncate">{t.name}</p>
                  <StatusPill status={t.status} />
                </div>
                <p className="text-stone-500 text-xs mt-0.5">
                  {[t.course, t.tournament_date, t.format].filter(Boolean).join(" · ")}
                </p>
              </button>
              <button
                onClick={() => remove(t)}
                title="Delete tournament"
                className="p-2 text-stone-600 hover:text-rose-400 transition shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    draft: "bg-stone-700 text-stone-300",
    live: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
    final: "bg-amber-500/15 text-amber-400",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${map[status] || map.draft}`}>{status}</span>;
}

// ─────────────────────────────────────────────
function TournamentEditor({ id, onBack }) {
  const [t, setT] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [holes, setHoles] = useState([]);
  const [powerUps, setPowerUps] = useState([]);
  const [tab, setTab] = useState("setup");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [tr, te, pl, ho, pu] = await Promise.all([
      supabase.from("golf_tournaments").select("*").eq("id", id).single(),
      supabase.from("golf_teams").select("*").eq("tournament_id", id).order("sort_order"),
      supabase.from("golf_tournament_players").select("*").eq("tournament_id", id),
      supabase.from("golf_tournament_holes").select("*").eq("tournament_id", id).order("hole_number"),
      supabase.from("golf_power_ups").select("*").eq("tournament_id", id).order("sort_order"),
    ]);
    setT(tr.data); setTeams(te.data || []); setPlayers(pl.data || []);
    setHoles(ho.data || []); setPowerUps(pu.data || []);
    setLoading(false);
  }, [id]);
  useEffect(() => { reload(); }, [reload]);

  const saveT = async (patch) => {
    setT((v) => ({ ...v, ...patch }));
    await supabase.from("golf_tournaments").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  };

  if (loading || !t) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-emerald-500 animate-spin" /></div>;

  const TABS = [
    { id: "setup", label: "Setup", icon: Trophy },
    { id: "teams", label: "Teams & Tags", icon: Users },
    { id: "holes", label: "Holes", icon: Flag },
    { id: "power", label: "Power-Ups", icon: Zap },
  ];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-stone-400 hover:text-white text-sm flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> All tournaments
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.name}</h1>
          <p className="text-stone-400 text-sm mt-1">{teams.length} teams · {players.length} players</p>
        </div>
        <div className="flex gap-2">
          {["draft", "live", "final"].map((s) => (
            <button key={s} onClick={() => saveT({ status: s })}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                t.status === s ? "bg-emerald-500 text-white" : "bg-stone-800 text-stone-400 hover:text-white"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {t.status === "draft" && (
        <p className="text-amber-400/90 text-xs bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
          Draft tournaments are hidden from the public leaderboard. Players with a bag tag can still check in to test. Set it to <strong>live</strong> on game day.
        </p>
      )}

      <div className="flex gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((x) => {
          const Icon = x.icon;
          return (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                tab === x.id ? "bg-emerald-500 text-white" : "text-stone-400 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" /> {x.label}
            </button>
          );
        })}
      </div>

      {tab === "setup" && <SetupTab t={t} saveT={saveT} />}
      {tab === "teams" && <TeamsTab id={id} teams={teams} players={players} reload={reload} />}
      {tab === "holes" && <HolesTab id={id} tournament={t} holes={holes} reload={reload} />}
      {tab === "power" && <PowerTab id={id} powerUps={powerUps} holes={holes} reload={reload} />}
    </div>
  );
}

function SetupTab({ t, saveT }) {
  const [f, setF] = useState(t);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
      <F label="Name"><input className="admin-input" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></F>
      <F label="Course"><input className="admin-input" value={f.course || ""} onChange={(e) => set("course", e.target.value)} /></F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Date"><input type="date" className="admin-input" value={f.tournament_date || ""} onChange={(e) => set("tournament_date", e.target.value)} /></F>
        <F label="Format"><input className="admin-input" value={f.format || ""} onChange={(e) => set("format", e.target.value)} /></F>
      </div>
      <F label="Notes for players"><textarea rows={4} className="admin-input resize-none" value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} /></F>
      <button onClick={() => saveT(f)} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2">
        <Check className="w-4 h-4" /> Save
      </button>
    </div>
  );
}

function TeamsTab({ id, teams, players, reload }) {
  const [busy, setBusy] = useState(false);

  const addTeam = async () => {
    const name = prompt("Team name?");
    if (!name) return;
    setBusy(true);
    await supabase.from("golf_teams").insert({ tournament_id: id, name, sort_order: teams.length });
    setBusy(false); reload();
  };

  const updateTeam = async (teamId, patch) => {
    await supabase.from("golf_teams").update(patch).eq("id", teamId);
    reload();
  };

  const delTeam = async (teamId) => {
    if (!confirm("Delete this team and its players?")) return;
    await supabase.from("golf_teams").delete().eq("id", teamId);
    reload();
  };

  const addPlayer = async (teamId) => {
    const name = prompt("Player name?");
    if (!name) return;
    const tag = prompt(`Bag tag number for ${name}?`);
    if (!tag) return;
    const { error } = await supabase.from("golf_tournament_players")
      .insert({ tournament_id: id, team_id: teamId, name, bag_tag: tag.trim() });
    if (error) alert(error.message.includes("duplicate") ? "That bag tag is already used in this tournament." : error.message);
    reload();
  };

  const delPlayer = async (pid) => {
    if (!confirm("Remove this player?")) return;
    await supabase.from("golf_tournament_players").delete().eq("id", pid);
    reload();
  };

  return (
    <div className="space-y-3">
      <button onClick={addTeam} disabled={busy} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
        <Plus className="w-4 h-4" /> Add Team
      </button>

      {teams.length === 0 && <p className="text-stone-500 text-sm">No teams yet.</p>}

      {teams.map((team) => {
        const roster = players.filter((p) => p.team_id === team.id);
        return (
          <div key={team.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <input
                defaultValue={team.name}
                onBlur={(e) => e.target.value !== team.name && updateTeam(team.id, { name: e.target.value })}
                className="bg-transparent text-white font-semibold outline-none border-b border-transparent focus:border-stone-600 flex-1 min-w-0"
              />
              <button onClick={() => delTeam(team.id)} className="p-1.5 text-stone-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <F label="Tee time" small>
                <input
                  type="datetime-local"
                  defaultValue={team.tee_time_at ? new Date(team.tee_time_at).toISOString().slice(0, 16) : ""}
                  className="admin-input"
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (!v) { updateTeam(team.id, { tee_time_at: null, tee_time: "" }); return; }
                    const d = new Date(v);
                    updateTeam(team.id, {
                      tee_time_at: d.toISOString(),
                      tee_time: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                    });
                  }}
                />
              </F>
              <F label="Start hole" small>
                <input defaultValue={team.starting_hole ?? 1} inputMode="numeric" className="admin-input"
                  onBlur={(e) => updateTeam(team.id, { starting_hole: parseInt(e.target.value) || 1 })} />
              </F>
              <F label="Flight" small>
                <input defaultValue={team.flight || ""} placeholder="A" className="admin-input"
                  onBlur={(e) => updateTeam(team.id, { flight: e.target.value })} />
              </F>
            </div>

            <p className="text-stone-500 text-[11px] mt-3 mb-1.5">
              Teams sharing a tee time <em>and</em> start hole are grouped as competitors.
              Setting a real date and time turns on the countdown on the player's Round tab.
            </p>

            <div className="space-y-1.5">
              {roster.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-stone-950/60 border border-stone-800 rounded-lg px-3 py-2">
                  <TagIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-stone-200 text-sm flex-1 truncate">{p.name}</span>
                  <span className="text-emerald-400 font-mono text-sm">#{p.bag_tag}</span>
                  <button onClick={() => delPlayer(p.id)} className="text-stone-600 hover:text-rose-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => addPlayer(team.id)} className="text-emerald-400 text-xs flex items-center gap-1 px-1 py-1">
                <Plus className="w-3.5 h-3.5" /> Add player + bag tag
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HolesTab({ id, tournament, holes, reload }) {
  const [busy, setBusy] = useState(false);

  const shape = (tournament?.holes_count ?? 18) === 9
    ? (tournament?.nine_side === "back" ? "back9" : "front9")
    : "18";

  const applyShape = async (next) => {
    const label = next === "18" ? "18 holes" : next === "back9" ? "the back 9 (holes 10-18)" : "the front 9 (holes 1-9)";
    if (holes.length && !confirm(`Switch this tournament to ${label}? Holes outside that range are removed, along with any scores on them.`)) return;
    setBusy(true);
    await supabase.rpc("golf_setup_holes", {
      p_tournament_id: id,
      p_holes: next === "18" ? 18 : 9,
      p_side: next === "back9" ? "back" : next === "front9" ? "front" : null,
    });
    setBusy(false);
    reload();
  };

  const setJackpot = async (hole) => {
    setBusy(true);
    await supabase.rpc("golf_set_jackpot_hole", { p_tournament_id: id, p_hole: hole });
    setBusy(false);
    reload();
  };

  const update = async (holeId, patch) => {
    await supabase.from("golf_tournament_holes").update(patch).eq("id", holeId);
    reload();
  };

  const challengeCount = holes.filter((h) => (h.challenge || "").trim()).length;
  const jackpot = holes.find((h) => h.is_jackpot);

  return (
    <div className="space-y-3">
      {/* Round shape */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <p className="text-stone-300 text-sm font-medium">How many holes?</p>
        <p className="text-stone-500 text-xs mt-0.5 mb-3">
          Nine-hole rounds keep the course's real numbering, so a back nine runs 10 through 18.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "18", label: "18 holes", sub: "Full round" },
            { id: "front9", label: "Front 9", sub: "Holes 1-9" },
            { id: "back9", label: "Back 9", sub: "Holes 10-18" },
          ].map((o) => (
            <button key={o.id} onClick={() => applyShape(o.id)} disabled={busy}
              className={`px-3 py-2.5 rounded-xl border text-left transition ${
                shape === o.id ? "bg-emerald-500 border-emerald-400 text-white" : "bg-stone-950/50 border-stone-700 text-stone-400 hover:border-stone-600"
              }`}>
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="block text-[11px] opacity-80">{o.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {holes.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center py-8">
          <p className="text-stone-400 text-sm">Pick a round length above to create the holes.</p>
        </div>
      ) : (
        <>
          {/* Jackpot */}
          <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-amber-300 text-sm font-medium">💰 Jackpot hole</p>
            <p className="text-stone-500 text-xs mt-0.5 mb-3">
              All bonuses on this hole count double. Pick one, or none.
            </p>
            <div className="grid grid-cols-9 gap-1">
              {holes.map((h) => (
                <button key={h.id} onClick={() => setJackpot(h.is_jackpot ? null : h.hole_number)} disabled={busy}
                  className={`py-1.5 rounded text-xs font-medium border transition ${
                    h.is_jackpot ? "bg-amber-400 text-stone-900 border-amber-300" : "bg-stone-950 text-stone-500 border-stone-700 hover:border-stone-600"
                  }`}>{h.hole_number}</button>
              ))}
            </div>
            {jackpot && <p className="text-amber-300/80 text-xs mt-2">Hole {jackpot.hole_number} is the Jackpot Hole. Tap it again to clear.</p>}
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <p className="text-stone-300 text-sm font-medium">Par & challenges</p>
            <p className="text-stone-500 text-xs mt-0.5">
              Set par for each hole, then add a challenge to any hole you want to feature.
              {challengeCount > 0 && <> Currently <strong className="text-emerald-400">{challengeCount}</strong> challenge hole{challengeCount === 1 ? "" : "s"}.</>}
            </p>
          </div>

          <div className="space-y-2">
            {holes.map((h) => <HoleRow key={h.id} hole={h} onUpdate={update} />)}
          </div>
        </>
      )}
    </div>
  );
}

function HoleRow({ hole, onUpdate }) {
  const hasChallenge = (hole.challenge || "").trim().length > 0;
  const [open, setOpen] = useState(hasChallenge);

  return (
    <div className={`rounded-xl border bg-stone-900 ${hasChallenge ? "border-emerald-500/40" : "border-stone-800"}`}>
      <div className="flex items-center gap-2 p-3">
        <span className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center shrink-0 ${
          hole.is_jackpot ? "bg-amber-400 text-stone-900" : "bg-stone-800 text-stone-200"
        }`}>
          {hole.hole_number}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-stone-500 text-xs">Par</span>
          <input
            defaultValue={hole.par}
            inputMode="numeric"
            style={{ width: "3.5rem" }}
            className="admin-input text-center"
            onBlur={(e) => onUpdate(hole.id, { par: parseInt(e.target.value) || 4 })}
          />
        </div>

        <div className="flex-1 min-w-0 text-right">
          {hasChallenge ? (
            <span className="text-emerald-400 text-xs truncate inline-block max-w-full">{hole.challenge}</span>
          ) : (
            <span className="text-stone-600 text-xs">No challenge</span>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            hasChallenge ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-stone-800 text-stone-400 hover:text-white"
          }`}
        >
          {open ? "Close" : hasChallenge ? "Edit" : "+ Challenge"}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-stone-800 pt-3">
          <div>
            <label className="block text-stone-400 text-xs mb-1.5">Pick a challenge</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CHALLENGE_TYPES.map((ct) => {
                const on = hole.challenge_type === ct.id;
                const suits = ct.suggestedPars.includes(hole.par);
                return (
                  <button
                    key={ct.id}
                    onClick={() => onUpdate(hole.id, {
                      challenge_type: ct.id,
                      challenge: ct.label,
                      challenge_reward: ct.reward,
                      challenge_effect: ct.effect,
                    })}
                    className={`text-left px-2.5 py-2 rounded-lg border text-xs transition ${
                      on ? "bg-emerald-500 border-emerald-400 text-white" : "bg-stone-950/60 border-stone-700 text-stone-300 hover:border-stone-600"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="text-sm leading-none">{ct.icon}</span> {ct.label}
                    </span>
                    <span className={`block text-[10px] mt-0.5 ${on ? "text-white/80" : "text-stone-500"}`}>
                      {ct.effect === 0 ? "No stroke change" : `${ct.effect} stroke${Math.abs(ct.effect) === 1 ? "" : "s"}`}
                      {!suits && ` · usually par ${ct.suggestedPars.join("/")}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {hasChallenge && (
            <>
              <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5">
                <p className="text-stone-400 text-[11px]">Players see</p>
                <p className="text-stone-200 text-xs mt-0.5">{hole.challenge}</p>
                <p className="text-emerald-400 text-[11px] mt-1">{hole.challenge_reward}</p>
                <p className="text-stone-500 text-[11px] mt-1">
                  Winning team ticks it on their scorecard{hole.challenge_effect ? ` and gets ${hole.challenge_effect} stroke${Math.abs(hole.challenge_effect) === 1 ? "" : "s"}` : ""}.
                </p>
              </div>

              <div>
                <label className="block text-stone-400 text-xs mb-1.5">Custom wording <span className="text-stone-600">(optional)</span></label>
                <input
                  defaultValue={hole.challenge || ""}
                  className="admin-input"
                  onBlur={(e) => onUpdate(hole.id, { challenge: e.target.value })}
                />
              </div>

              <button
                onClick={() => { onUpdate(hole.id, { challenge: "", challenge_reward: "", challenge_type: "", challenge_effect: 0 }); setOpen(false); }}
                className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove challenge from this hole
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PowerTab({ id, powerUps, holes, reload }) {
  const holeCount = holes.length || 18;
  const [saving, setSaving] = useState(false);

  const addFromTemplate = async (tpl) => {
    setSaving(true);
    await supabase.from("golf_power_ups").insert(templateToRow(tpl, id, powerUps.length));
    setSaving(false);
    reload();
  };

  const change = async (puId, patch) => {
    await supabase.from("golf_power_ups").update(patch).eq("id", puId);
    reload();
  };

  const del = async (puId) => {
    if (!confirm("Delete this card?")) return;
    await supabase.from("golf_power_ups").delete().eq("id", puId);
    reload();
  };

  const loadScrambleDeck = async () => {
    if (powerUps.length && !confirm("Add the full Yard$ 2v2 Scramble card set? Existing cards are kept — you may end up with duplicates.")) return;
    setSaving(true);
    await supabase.from("golf_power_ups").insert(scrambleCardRows(id));
    setSaving(false);
    reload();
  };

  const automatic = powerUps.filter((p) => isAutoAwarded(p));
  const manual = powerUps.filter((p) => !isAutoAwarded(p));

  const autoTemplates = CARD_TEMPLATES.filter((t) => t.preset);
  const manualTemplates = CARD_TEMPLATES.filter((t) => !t.preset);

  return (
    <div className="space-y-6">
      {/* One-tap official deck */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <h3 className="text-white font-bold">{SCRAMBLE_META.name}</h3>
        <p className="text-stone-400 text-xs mt-1 leading-relaxed">
          Loads every Yard$ Twist from the rule sheet already configured — Hot Streak on birdies,
          Bomber Bonus on par 4s and 5s, 15-Footer and Closest to the Pin worth a stroke, The Snake, and the rest.
        </p>
        <button onClick={loadScrambleDeck} disabled={saving}
          className="mt-3 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white disabled:opacity-50">
          Load the official card set
        </button>
      </div>

      {/* ── Automatic: rewards & penalties from the score ── */}
      <PowerSection
        title="Rewards & Penalties"
        blurb="Given out automatically when a team saves their score for a hole. The player sees a popup and it lands in their inventory."
        tone="sky"
        templates={autoTemplates}
        onAdd={addFromTemplate}
        saving={saving}
      >
        {automatic.length === 0
          ? <Empty text="Nothing automatic yet — add one above." />
          : automatic.map((pu) => (
              <AdminPowerUpCard key={pu.id} card={pu} holeCount={holeCount} onChange={change} onDelete={del} />
            ))}
      </PowerSection>

      {/* ── Manual: cards teams carry ── */}
      <PowerSection
        title="Power-Ups & Bonuses"
        blurb="Teams start the round holding these and choose when to play them. They tick them off on the hole they use them."
        tone="amber"
        templates={manualTemplates}
        onAdd={addFromTemplate}
        saving={saving}
      >
        {manual.length === 0
          ? <Empty text="No carried cards yet — add one above." />
          : manual.map((pu) => (
              <AdminPowerUpCard key={pu.id} card={pu} holeCount={holeCount} onChange={change} onDelete={del} />
            ))}
      </PowerSection>
    </div>
  );
}

function PowerSection({ title, blurb, tone, templates, onAdd, saving, children }) {
  const tones = {
    sky: "border-sky-500/25 bg-sky-500/5",
    amber: "border-amber-500/25 bg-amber-500/5",
  };
  return (
    <div>
      <div className={`rounded-2xl border ${tones[tone]} p-4 mb-3`}>
        <h3 className="text-white font-bold">{title}</h3>
        <p className="text-stone-400 text-xs mt-1 leading-relaxed">{blurb}</p>

        <div className="flex flex-wrap gap-2 mt-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onAdd(t)}
              disabled={saving}
              className="text-left px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 hover:border-stone-500 transition disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5 text-stone-200 text-sm font-medium">
                <span className="text-base leading-none">{t.icon}</span> {t.label}
              </span>
              <span className="block text-stone-500 text-[11px] mt-0.5">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-stone-600 text-xs bg-stone-900 border border-stone-800 rounded-xl px-4 py-6 text-center">{text}</p>;
}

function F({ label, children, small }) {
  return (
    <div>
      <label className={`block text-stone-400 mb-1.5 ${small ? "text-xs" : "text-sm"}`}>{label}</label>
      {children}
    </div>
  );
}
