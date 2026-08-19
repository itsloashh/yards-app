"use client";
// Local rounds: public games played without an account.
// Everything lives in localStorage on the phone that created it, which also
// gives us a round history for free.
//
// The award/ledger rules here mirror the SQL in migration-golf-auto-awards.sql
// exactly, so a casual round scores identically to a tournament round.

import { modeById, modeCards } from "@/lib/gameModes";

const KEY = "yards_golf_rounds";
const uid = () => Math.random().toString(36).slice(2, 10);

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function writeAll(rounds) {
  try { localStorage.setItem(KEY, JSON.stringify(rounds)); } catch {}
}

export function listRounds() {
  return readAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
export function getRound(id) {
  return readAll().find((r) => r.id === id) || null;
}
export function deleteRound(id) {
  writeAll(readAll().filter((r) => r.id !== id));
}
export function saveRound(round) {
  const all = readAll();
  const i = all.findIndex((r) => r.id === round.id);
  const next = { ...round, updatedAt: Date.now() };
  if (i >= 0) all[i] = next; else all.push(next);
  writeAll(all);
  return next;
}

/** Hole numbers for a round shape — the back nine keeps 10-18. */
export function holeNumbersFor(holesCount, side) {
  if (holesCount === 9 && side === "back") return Array.from({ length: 9 }, (_, i) => i + 10);
  if (holesCount === 9) return Array.from({ length: 9 }, (_, i) => i + 1);
  return Array.from({ length: 18 }, (_, i) => i + 1);
}

export function createRound({ modeId, course = "", holesCount = 18, side = null, teams = [], pars = {} }) {
  const numbers = holeNumbersFor(holesCount, side);
  return saveRound({
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modeId,
    course,
    holesCount,
    side,
    status: "active",
    holes: numbers.map((n) => ({
      hole_number: n,
      par: pars[n] ?? 4,
      challenge: "",
      challenge_type: "",
      challenge_reward: "",
      challenge_effect: 0,
      is_jackpot: false,
    })),
    teams: teams.map((t, i) => ({
      id: t.id || `t${i + 1}`,
      name: t.name || `Team ${i + 1}`,
      players: t.players || [],
      scores: [],
      power_up_uses: [],
      challenge_wins: [],
    })),
  });
}

/** The card list for a round (fixed by mode — players can't edit these). */
export function cardsForRound(round) {
  return modeCards(round?.modeId);
}

// ─── Scoring ───────────────────────────────────────────────────────────────
const remainingFor = (card, ledger) =>
  (card?.uses_per_team ?? 0) +
  ledger.filter((e) => e.power_up_id === card?.id)
        .reduce((a, e) => a + (e.delta ?? (e.entry_type === "grant" ? 1 : -1)), 0);

/**
 * Evaluate award rules for a hole. Mirrors golf_eval_awards():
 * clears this hole's auto grants first, so re-saving never double-awards.
 */
function evaluateAwards(round, team, hole) {
  const cards = cardsForRound(round);
  team.power_up_uses = (team.power_up_uses || []).filter(
    (e) => !(e.hole_number === hole && e.entry_type === "grant" && e.source === "auto")
  );

  const score = (team.scores || []).find((s) => s.hole_number === hole);
  if (!score || !(score.strokes > 0)) return [];

  const par = round.holes.find((h) => h.hole_number === hole)?.par ?? 4;
  const granted = [];

  for (const card of cards) {
    if ((card.award_metric || "none") === "none") continue;
    let metric;
    if (card.award_metric === "score_vs_par") metric = (score.strokes + (score.penalties || 0)) - par;
    else if (card.award_metric === "penalties") metric = score.penalties || 0;
    else if (card.award_metric === "strokes") metric = score.strokes || 0;
    else continue;

    const cmp = card.award_comparator || "lte";
    const val = card.award_value ?? 0;
    const hit = cmp === "lte" ? metric <= val : cmp === "gte" ? metric >= val : metric === val;
    if (!hit) continue;

    const amount = Math.max(1, card.award_amount ?? 1);
    team.power_up_uses.push({
      id: uid(), power_up_id: card.id, hole_number: hole,
      entry_type: "grant", delta: amount, source: "auto",
      used_by: "auto", option_label: "", used_at: new Date().toISOString(),
    });
    granted.push({
      power_up_id: card.id, name: card.name, icon: card.icon,
      color: card.color, kind: card.kind, amount,
      message: card.award_message || card.description,
    });
  }
  return granted;
}

export function saveHoleScore(round, teamId, hole, strokes, penalties = 0) {
  const next = { ...round, teams: round.teams.map((t) => ({ ...t })) };
  const team = next.teams.find((t) => t.id === teamId);
  if (!team) return { round, granted: [] };

  team.scores = [...(team.scores || []).filter((s) => s.hole_number !== hole),
    { hole_number: hole, strokes: Number(strokes) || 0, penalties: Number(penalties) || 0, updated_at: new Date().toISOString() }];

  const granted = evaluateAwards(next, team, hole);

  // Round is complete once every team has a score on every hole
  const done = next.teams.every((t) =>
    next.holes.every((h) => (t.scores || []).some((s) => s.hole_number === h.hole_number && s.strokes > 0))
  );
  next.status = done ? "complete" : "active";

  return { round: saveRound(next), granted };
}

/** Replace a hole's manual entries — mirrors golf_set_hole_power_ups(). */
export function setHoleCards(round, teamId, hole, selections = []) {
  const next = { ...round, teams: round.teams.map((t) => ({ ...t })) };
  const team = next.teams.find((t) => t.id === teamId);
  if (!team) return { ok: false, error: "Team not found", round };

  const cards = cardsForRound(round);
  const par = next.holes.find((h) => h.hole_number === hole)?.par;

  // Clear manual entries for this hole, keeping auto grants
  team.power_up_uses = (team.power_up_uses || []).filter(
    (e) => !(e.hole_number === hole && (e.source || "manual") === "manual")
  );

  for (const sel of selections) {
    const card = cards.find((c) => c.id === sel.power_up_id);
    if (!card) continue;

    if (card.allowed_pars?.length && !card.allowed_pars.includes(par)) {
      return { ok: false, error: `${card.name} is only valid on par ${card.allowed_pars.join("/")} holes`, round };
    }
    if (card.options?.length && !sel.option_label) {
      return { ok: false, error: `Pick an option for ${card.name}`, round };
    }

    const logged = card.acquire_mode === "logged";
    if (logged) {
      team.power_up_uses.push({
        id: uid(), power_up_id: card.id, hole_number: hole,
        entry_type: "grant", delta: 1, source: "manual",
        used_by: "", option_label: sel.option_label || "", used_at: new Date().toISOString(),
      });
    } else {
      if (remainingFor(card, team.power_up_uses) <= 0) {
        return { ok: false, error: `No ${card.name} left to use`, round };
      }
      team.power_up_uses.push({
        id: uid(), power_up_id: card.id, hole_number: hole,
        entry_type: "spend", delta: -1, source: "manual",
        used_by: "", option_label: sel.option_label || "", used_at: new Date().toISOString(),
      });
    }
  }

  return { ok: true, round: saveRound(next) };
}

export function setChallengeWinLocal(round, teamId, hole, won) {
  const next = { ...round, teams: round.teams.map((t) => ({ ...t })) };
  const team = next.teams.find((t) => t.id === teamId);
  if (!team) return round;
  team.challenge_wins = (team.challenge_wins || []).filter((w) => w.hole_number !== hole);
  if (won) team.challenge_wins.push({ hole_number: hole });
  return saveRound(next);
}

/** Shape a local round like the server state, so shared components just work. */
export function toStateShape(round) {
  return {
    ok: true,
    tournament: {
      id: round.id,
      name: modeById(round.modeId).name,
      course: round.course,
      format: modeById(round.modeId).short,
      holes_count: round.holesCount,
      nine_side: round.side,
      status: round.status === "complete" ? "final" : "live",
    },
    holes: round.holes,
    teams: round.teams,
    power_ups: cardsForRound(round),
  };
}
