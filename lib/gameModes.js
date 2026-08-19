// Game modes available to play publicly, without a tournament or bag tag.
// The scramble mode reuses the tournament rule set verbatim so everyone is
// playing the same game — nothing here is configurable by the player.

import { SCRAMBLE_META, CORE_RULES, TWIST_RULES } from "@/lib/scrambleRules";

// ─── Casual Golf — the Fun Round rule sheet ───
export const FUN_ROUND_META = {
  name: "Casual Golf",
  tagline: "Casual golf · Friends · Good times",
  motto: "Have fun, play some golf, talk some shit, and don't take it too seriously.",
  footer: "This round does not count toward your official handicap.",
};

export const FUN_ROUND_RULES = [
  {
    n: 1, title: "One Mulligan Per 9", icon: "👑",
    body: "Everyone gets 1 mulligan per 9 holes. Use it whenever you want. Bad drive? Shanked iron? Chunked wedge? Call your mulligan and hit again.",
  },
  {
    n: 2, title: "Improve Your Lie", icon: "🌾",
    body: "If your ball is sitting in an absolutely terrible spot, you can move it a club-length to a better lie. Don't move it onto the green or closer to the hole.",
  },
  {
    n: 3, title: "Whiffs", icon: "💨",
    body: "A complete air swing doesn't count if you clearly weren't trying to hit the ball. But if you were actually taking a swing at it — that's a stroke.",
  },
  {
    n: 4, title: "Gimmies Are Allowed", icon: "⛳",
    body: "Inside roughly 3 feet is good. Pick it up and count the putt. If someone wants to putt it anyway, respect the grind.",
  },
  {
    n: 5, title: "Lost Balls", icon: "🔍",
    body: "Don't spend 15 minutes looking for a $2 golf ball. Give yourself a reasonable drop, add 1 stroke, and keep moving. Golf, not search and rescue.",
  },
  {
    n: 6, title: "Water", icon: "💧",
    body: "Ball goes swimming? Drop near where it entered +1 stroke. No need to make the hole harder than it already is.",
  },
  {
    n: 7, title: "Out Of Bounds", icon: "🚧",
    body: "If you absolutely bomb one into someone's backyard, drop somewhere reasonable near where it went out +1 stroke. Keep the group moving.",
  },
  {
    n: 8, title: "Pick Up If You're Having A Disaster", icon: "😅",
    body: "If you're having a 10+ stroke hole and the group is waiting, pick it up, take a reasonable max score, and move on. Nobody needs to watch a 14-stroke par 4.",
  },
  {
    n: 9, title: "Help Each Other", icon: "🙌",
    body: "Give advice. Help find balls. Point out hazards. Help with distances. We're playing together, not against each other.",
  },
  {
    n: 10, title: "The Golden Rule", icon: "🧊",
    body: "If there's ever a disagreement, choose the option that keeps the round fun and moving. Don't argue over a rule for 10 minutes. We're here to golf with friends.",
  },
];

export const FUN_ROUND_STANDARD = [
  "Mulligans", "Gimmies", "Lift & clean", "Friendly drops", "Talk shit", "Have fun",
];

// ─── Modes ───
export const GAME_MODES = [
  {
    id: "scramble2v2",
    name: SCRAMBLE_META.name,
    short: "2v2 Scramble",
    tagline: SCRAMBLE_META.tagline,
    icon: "🏆",
    accent: "lime",
    teamBased: true,
    teamSize: 2,
    minTeams: 2,
    maxTeams: 4,
    usesCards: true,
    blurb: "The full Yard$ tournament game — power-ups, penalties and challenge holes. Same rules we run our events on.",
    meta: SCRAMBLE_META,
    rules: CORE_RULES,
    twists: TWIST_RULES,
  },
  {
    id: "casual",
    name: FUN_ROUND_META.name,
    short: "Casual Golf",
    tagline: FUN_ROUND_META.tagline,
    icon: "🍺",
    accent: "sky",
    teamBased: false,
    teamSize: 1,
    minTeams: 1,
    maxTeams: 6,
    usesCards: false,
    blurb: "Straight scorekeeping with the Fun Round rules. Mulligans, gimmies and friendly drops — no pressure.",
    meta: FUN_ROUND_META,
    rules: FUN_ROUND_RULES,
    twists: [],
    standard: FUN_ROUND_STANDARD,
  },
];

export const modeById = (id) => GAME_MODES.find((m) => m.id === id) || GAME_MODES[0];

// Cards for a mode, keyed by a stable string (no database ids out here).
export function modeCards(modeId) {
  const mode = modeById(modeId);
  if (!mode.usesCards) return [];
  return (mode.twists || [])
    .filter((t) => t.card)
    .map((t) => ({
      id: t.key,
      name: t.title,
      icon: t.icon,
      color: t.color,
      description: t.body,
      kind: t.card.kind,
      acquire_mode: t.card.acquire_mode,
      uses_per_team: t.card.uses_per_team ?? 0,
      score_effect: t.card.score_effect ?? 0,
      allowed_pars: t.card.allowed_pars ?? [],
      allowed_holes: [],
      options: t.card.options ?? [],
      award_metric: t.card.award_metric ?? "none",
      award_comparator: t.card.award_comparator ?? "lte",
      award_value: t.card.award_value ?? 0,
      award_amount: t.card.award_amount ?? 1,
      award_message: t.card.award_message ?? "",
      enabled: true,
    }));
}
