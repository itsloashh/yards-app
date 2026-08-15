"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, X, Trophy, Check, Users, Zap, Flag, ChevronLeft, Tag as TagIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminPowerUpCard from "@/components/golf/AdminPowerUpCard";
import { defaultColorFor } from "@/lib/powerUpStyles";

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
            <button key={t.id} onClick={() => setOpenId(t.id)} className="w-full text-left bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center gap-4 hover:border-stone-700 transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-stone-100 font-semibold truncate">{t.name}</p>
                  <StatusPill status={t.status} />
                </div>
                <p className="text-stone-500 text-xs mt-0.5">
                  {[t.course, t.tournament_date, t.format].filter(Boolean).join(" · ")}
                </p>
              </div>
            </button>
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
      {tab === "holes" && <HolesTab id={id} holes={holes} reload={reload} />}
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
                <input defaultValue={team.tee_time || ""} placeholder="8:10 AM" className="admin-input"
                  onBlur={(e) => updateTeam(team.id, { tee_time: e.target.value })} />
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

function HolesTab({ id, holes, reload }) {
  const update = async (holeId, patch) => {
    await supabase.from("golf_tournament_holes").update(patch).eq("id", holeId);
    reload();
  };
  const seed = async () => {
    await supabase.rpc("golf_seed_holes", { p_tournament_id: id, p_holes: 18 });
    reload();
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
      {holes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm mb-3">No holes set up.</p>
          <button onClick={seed} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold">Create 18 holes</button>
        </div>
      ) : (
        <>
          <p className="text-stone-500 text-xs mb-3">Set par and mark any challenge holes — these show on the player's round info and scorecard.</p>
          <div className="space-y-1.5">
            {holes.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 text-sm font-bold flex items-center justify-center shrink-0">{h.hole_number}</span>
                <input defaultValue={h.par} inputMode="numeric" className="admin-input w-16 shrink-0 text-center"
                  onBlur={(e) => update(h.id, { par: parseInt(e.target.value) || 4 })} />
                <input defaultValue={h.challenge || ""} placeholder="Challenge (optional)" className="admin-input flex-1"
                  onBlur={(e) => update(h.id, { challenge: e.target.value })} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PowerTab({ id, powerUps, holes, reload }) {
  const holeCount = holes.length || 18;
  const [saving, setSaving] = useState(false);

  const add = async (kind) => {
    setSaving(true);
    await supabase.from("golf_power_ups").insert({
      tournament_id: id,
      name: kind === "hazard" ? "New Caution" : "New Power-Up",
      kind,
      icon: kind === "hazard" ? "\u26A0\uFE0F" : "\u26A1",
      color: defaultColorFor(kind),
      uses_per_team: 1,
      enabled: true,
      sort_order: powerUps.length,
    });
    setSaving(false);
    reload();
  };

  // Debounced-ish: write straight through, the card holds its own text state
  const change = async (puId, patch) => {
    await supabase.from("golf_power_ups").update(patch).eq("id", puId);
    reload();
  };

  const del = async (puId) => {
    if (!confirm("Delete this card?")) return;
    await supabase.from("golf_power_ups").delete().eq("id", puId);
    reload();
  };

  const boosts = powerUps.filter((p) => p.kind !== "hazard");
  const cautions = powerUps.filter((p) => p.kind === "hazard");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => add("power_up")} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Power-Up
        </button>
        <button onClick={() => add("hazard")} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Caution
        </button>
      </div>

      <p className="text-stone-500 text-xs">
        Tap a card to expand it. The toggle switches it on or off for the round without deleting it —
        players only see cards that are on.
      </p>

      <Section title="Power-Ups" count={boosts.length}>
        {boosts.map((pu) => (
          <AdminPowerUpCard key={pu.id} card={pu} holeCount={holeCount} onChange={change} onDelete={del} />
        ))}
        {boosts.length === 0 && <Empty text="No power-ups yet." />}
      </Section>

      <Section title="Cautions" count={cautions.length}>
        {cautions.map((pu) => (
          <AdminPowerUpCard key={pu.id} card={pu} holeCount={holeCount} onChange={change} onDelete={del} />
        ))}
        {cautions.length === 0 && <Empty text="No cautions yet." />}
      </Section>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div>
      <h3 className="text-stone-300 font-semibold text-sm mb-2">
        {title} <span className="text-stone-600">({count})</span>
      </h3>
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
