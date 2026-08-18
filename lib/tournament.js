"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const TAG_KEY = "yards_golf_bag_tag";
const QUEUE_KEY = "yards_golf_score_queue";

// ─── Bag tag stored on the device so players stay signed in ───
export function getSavedTag() {
  try { return localStorage.getItem(TAG_KEY) || ""; } catch { return ""; }
}
export function saveTag(tag) {
  try { localStorage.setItem(TAG_KEY, tag); } catch {}
}
export function clearTag() {
  try { localStorage.removeItem(TAG_KEY); } catch {}
}

// ─── Sign in with the number on the physical bag tag ───
export async function signInWithTag(tag) {
  const clean = String(tag || "").trim();
  if (!clean) return { ok: false, error: "Enter your bag tag number" };
  const { data, error } = await supabase.rpc("golf_tag_signin", { p_bag_tag: clean });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "Tag not found" };
  return data;
}

// ─── Hook: the signed-in player's round ───
export function useRound() {
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (tag) => {
    const t = tag || getSavedTag();
    if (!t) { setRound(null); setLoading(false); return; }
    setLoading(true);
    const res = await signInWithTag(t);
    if (res.ok) { setRound(res); saveTag(t); setError(""); }
    else { setError(res.error); setRound(null); }
    setLoading(false);
    return res;
  }, []);

  useEffect(() => { load(); }, [load]);

  const signOut = useCallback(() => { clearTag(); setRound(null); }, []);
  return { round, loading, error, load, signOut, setRound };
}

// ─── Hook: live tournament state, refreshed on every score change ───
export function useLiveTournament(tournamentId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timer = useRef(null);

  const fetchState = useCallback(async () => {
    if (!tournamentId) return;
    const { data, error } = await supabase.rpc("golf_tournament_state", { p_tournament_id: tournamentId });
    if (!error && data?.ok) {
      setState(data);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // Realtime: any score or power-up change anywhere in the event refreshes
  // the board. Debounced so a burst of updates is one refetch.
  useEffect(() => {
    if (!tournamentId) return;
    const bump = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(fetchState, 350);
    };

    const channel = supabase
      .channel(`golf-live-${tournamentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "golf_team_scores", filter: `tournament_id=eq.${tournamentId}` }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "golf_power_up_uses", filter: `tournament_id=eq.${tournamentId}` }, bump)
      .subscribe();

    // Safety net in case the socket drops on a patchy course connection
    const poll = setInterval(fetchState, 30000);

    return () => {
      clearTimeout(timer.current);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [tournamentId, fetchState]);

  return { state, loading, lastUpdate, refresh: fetchState };
}

// ─── Offline-tolerant score saving ───
function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

export async function saveScore({ tag, hole, strokes, penalties = 0, note = "" }) {
  const payload = {
    p_bag_tag: tag, p_hole: hole,
    p_strokes: Number(strokes) || 0,
    p_penalties: Number(penalties) || 0,
    p_note: note || "",
  };
  try {
    const { data, error } = await supabase.rpc("golf_save_score", payload);
    if (error) throw error;
    if (!data?.ok) return { ok: false, error: data?.error || "Could not save" };
    return { ok: true, granted: data.granted || [] };
  } catch (e) {
    // Cell service on a course is unreliable — hold it and retry later
    const q = readQueue().filter((i) => !(i.p_hole === payload.p_hole && i.p_bag_tag === payload.p_bag_tag));
    q.push(payload);
    writeQueue(q);
    return { ok: false, queued: true, error: "Saved offline — will sync when you're back online" };
  }
}

export async function flushQueue() {
  const q = readQueue();
  if (!q.length) return { flushed: 0 };
  const remaining = [];
  let flushed = 0;
  for (const item of q) {
    try {
      const { data, error } = await supabase.rpc("golf_save_score", item);
      if (error || !data?.ok) remaining.push(item);
      else flushed++;
    } catch { remaining.push(item); }
  }
  writeQueue(remaining);
  return { flushed, pending: remaining.length };
}

export function useQueueSync() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const sync = async () => {
      const res = await flushQueue();
      setPending(res.pending ?? 0);
    };
    setPending(readQueue().length);
    window.addEventListener("online", sync);
    const t = setInterval(sync, 20000);
    return () => { window.removeEventListener("online", sync); clearInterval(t); };
  }, []);
  return pending;
}

// ─── Power-ups ───
export async function usePowerUp(tag, powerUpId, hole, option = "") {
  const { data, error } = await supabase.rpc("golf_use_power_up", {
    p_bag_tag: tag, p_power_up_id: powerUpId, p_hole: hole, p_option: option || "",
  });
  if (error) return { ok: false, error: error.message };
  return data?.ok ? { ok: true } : { ok: false, error: data?.error };
}

/**
 * Replace which power-ups the team used on a hole, in one call.
 * selections: [{ power_up_id, option_label }]
 */
export async function setHolePowerUps(tag, hole, selections = []) {
  const { data, error } = await supabase.rpc("golf_set_hole_power_ups", {
    p_bag_tag: tag,
    p_hole: hole,
    p_selections: selections.map((s) => ({
      power_up_id: s.power_up_id,
      option_label: s.option_label || "",
    })),
  });
  if (error) return { ok: false, error: error.message };
  return data?.ok ? { ok: true } : { ok: false, error: data?.error };
}

export async function undoPowerUp(tag, useId) {
  const { data, error } = await supabase.rpc("golf_undo_power_up", {
    p_bag_tag: tag, p_use_id: useId,
  });
  if (error) return { ok: false, error: error.message };
  return data?.ok ? { ok: true } : { ok: false, error: data?.error };
}

// ─── Scoring helpers ───
export function parFor(holes, holeNumber) {
  return holes?.find((h) => h.hole_number === holeNumber)?.par ?? 4;
}

export function teamTotals(team, holes) {
  const scores = team?.scores || [];
  let strokes = 0, penalties = 0, played = 0, parPlayed = 0;
  for (const s of scores) {
    if (s.strokes == null || s.strokes === 0) continue;
    strokes += s.strokes || 0;
    penalties += s.penalties || 0;
    parPlayed += parFor(holes, s.hole_number);
    played++;
  }
  const total = strokes + penalties;
  return { strokes, penalties, total, played, toPar: total - parPlayed };
}

export function formatToPar(n) {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

// Rank teams by to-par, then by holes played (more holes = tiebreak ahead)
export function rankTeams(teams = [], holes = []) {
  return [...teams]
    .map((t) => ({ ...t, totals: teamTotals(t, holes) }))
    .sort((a, b) => {
      if (a.totals.played === 0 && b.totals.played === 0) return a.name.localeCompare(b.name);
      if (a.totals.played === 0) return 1;
      if (b.totals.played === 0) return -1;
      if (a.totals.toPar !== b.totals.toPar) return a.totals.toPar - b.totals.toPar;
      return b.totals.played - a.totals.played;
    });
}
