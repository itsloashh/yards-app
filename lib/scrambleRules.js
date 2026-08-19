// Yard$ 2v2 Scramble — the rule sheet as structured data.
// Everything in the tournament section references this, so the app and the
// printed sheet can never drift apart.

export const SCRAMBLE_META = {
  name: "Yard$ 2v2 Scramble",
  tagline: "2 teams of 2 · Pick the best ball · Lowest score wins",
  motto: "Team up. Play smart. Keep it moving. Have some fun.",
  footer: "This is a fun round — not the PGA Tour.",
};

// The 10 core rules, in sheet order.
export const CORE_RULES = [
  {
    n: 1, title: "Both Players Hit", icon: "⛳",
    body: "Every player hits their shot. Pick the team's best ball. The other ball is picked up.",
  },
  {
    n: 2, title: "Play From The Best Ball", icon: "🚩",
    body: "Once your team chooses its ball, both players play their next shot from that location. Then choose the better result again. Repeat until you're in the hole.",
  },
  {
    n: 3, title: "On The Green", icon: "🏌️",
    body: "Both players putt from the selected ball's location. If one player makes it, the hole is finished. No need to make the other putt.",
  },
  {
    n: 4, title: "Tee Shot Rule", icon: "🏌️‍♂️",
    body: "To keep everyone involved: each player must have at least 2 tee shots used by your team during the 18 holes. Pick smart and get involved.",
  },
  {
    n: 5, title: "One Mulligan Each", icon: "😎",
    body: "Every player gets 1 mulligan for the entire round. Use it on any shot. Once it's gone, it's gone.",
  },
  {
    n: 6, title: "Friendly Lies", icon: "🌾",
    body: "If the team's chosen ball is in a terrible spot, you may move it up to one club-length for a playable lie. Never closer to the hole.",
  },
  {
    n: 7, title: "Water / Lost Ball", icon: "💧",
    body: "If your chosen ball goes into water or is lost, take a reasonable drop +1 stroke. Keep playing. Don't waste time looking for a $2 ball.",
  },
  {
    n: 8, title: "Out Of Bounds", icon: "🚧",
    body: "If the chosen ball goes out of bounds, take a reasonable drop near where it went out +1 stroke. Keep the game moving.",
  },
  {
    n: 9, title: "Score", icon: "📝",
    body: "Each team records ONE score per hole. Example: Par 4 — team takes 5 shots = 5. Lowest total after 18 holes wins.",
  },
  {
    n: 10, title: "Yard$ Golden Rule", icon: "🤙",
    body: "If there's ever a disagreement: make the call that keeps the round fun and moving. No rules arguments. No loophole hunting. No taking yourselves too seriously.",
  },
];

// The Yard$ Twist rules — these map onto power-up cards.
// `card` describes how the matching card should be configured.
export const TWIST_RULES = [
  {
    key: "fifteen_footer",
    title: "15-Footer Bonus", icon: "🎯", color: "sky",
    body: "If BOTH teammates hole their putts from 15+ feet, subtract 1 stroke from your team score. Max 1 bonus per hole.",
    card: { kind: "power_up", acquire_mode: "logged", score_effect: -1, uses_per_team: 0 },
  },
  {
    key: "bomber_bonus",
    title: "Bomber Bonus", icon: "💣", color: "lime",
    body: "On par 4s & 5s, if both tee shots hit the fairway, earn a Yard$ Bonus. Use it later for one extra club-length improvement on any shot.",
    card: { kind: "power_up", acquire_mode: "logged", score_effect: 0, uses_per_team: 0, allowed_pars: [4, 5] },
  },
  {
    key: "captains_pick",
    title: "Captain's Pick", icon: "🧢", color: "violet",
    body: "Each team gets 1 Captain's Pick per round. Before a shot, call it. You must use that player's shot, no matter what.",
    card: { kind: "power_up", acquire_mode: "allowance", score_effect: 0, uses_per_team: 1 },
  },
  {
    key: "closest_pin",
    title: "Closest To The Pin", icon: "🚩", color: "amber",
    body: "On designated par 3s, the closest tee shot wins a Yard$ Bonus: subtract 1 stroke from your team score on that hole.",
    card: { kind: "power_up", acquire_mode: "logged", score_effect: -1, uses_per_team: 0, allowed_pars: [3] },
  },
  {
    key: "ice_cold",
    title: "Ice Cold", icon: "🧊", color: "sky",
    body: "Make 3 consecutive pars or better as a team and earn a Free Mulligan. Must be used before the end of the next hole.",
    card: { kind: "power_up", acquire_mode: "logged", score_effect: 0, uses_per_team: 0 },
  },
  {
    key: "hot_streak",
    title: "Hot Streak", icon: "🔥", color: "orange",
    body: "Make a birdie or better? Earn a Hot Streak token. Use it later to replay one shot after seeing the result.",
    card: {
      kind: "power_up", acquire_mode: "auto", score_effect: 0, uses_per_team: 0,
      award_metric: "score_vs_par", award_comparator: "lte", award_value: -1, award_amount: 1,
      award_message: "Birdie or better — Hot Streak token earned!",
      options: [
        "Replay one shot",
        "Move up 2 club lengths *Not applied to putting*",
        "Improve lie up to one club length",
        "One extra putt",
      ],
    },
  },
  {
    key: "the_snake",
    title: "The Snake", icon: "🐍", color: "rose",
    body: "If both tee shots end up in trouble (water, OB, trees, etc.), your team earns The Snake. Next shot must be played as it lies. No improvement.",
    card: { kind: "hazard", acquire_mode: "logged", score_effect: 0, uses_per_team: 0 },
  },
  {
    key: "jackpot_hole",
    title: "Jackpot Hole", icon: "💰", color: "amber",
    body: "One designated hole is the Jackpot Hole. All bonuses on this hole are worth DOUBLE. Big risk. Bigger reward.",
    card: null, // configured on the hole itself, not as a card
  },
];

// Build the full preset deck for a new scramble tournament.
export function scrambleCardRows(tournamentId) {
  return TWIST_RULES.filter((r) => r.card).map((r, i) => ({
    tournament_id: tournamentId,
    name: r.title,
    icon: r.icon,
    color: r.color,
    description: r.body,
    kind: r.card.kind,
    acquire_mode: r.card.acquire_mode,
    uses_per_team: r.card.uses_per_team ?? 0,
    score_effect: r.card.score_effect ?? 0,
    allowed_pars: r.card.allowed_pars ?? [],
    allowed_holes: [],
    options: r.card.options ?? [],
    award_metric: r.card.award_metric ?? "none",
    award_comparator: r.card.award_comparator ?? "lte",
    award_value: r.card.award_value ?? 0,
    award_amount: r.card.award_amount ?? 1,
    award_message: r.card.award_message ?? "",
    enabled: true,
    sort_order: i,
  }));
}

// ─── Hole challenge presets ────────────────────────────────────────────────
// Picked from a list instead of typed, so the reward is always wired to a real
// scorecard effect. `effect` is the stroke change the winning team receives.
export const CHALLENGE_TYPES = [
  {
    id: "closest_pin",
    label: "Closest to the Pin",
    icon: "🚩",
    reward: "Subtract 1 stroke from your team score on this hole",
    effect: -1,
    suggestedPars: [3],
  },
  {
    id: "long_drive",
    label: "Long Drive",
    icon: "💪",
    reward: "Subtract 1 stroke from your team score on this hole",
    effect: -1,
    suggestedPars: [4, 5],
  },
  {
    id: "straightest_drive",
    label: "Straightest Drive",
    icon: "🎯",
    reward: "Subtract 1 stroke from your team score on this hole",
    effect: -1,
    suggestedPars: [4, 5],
  },
  {
    id: "fifteen_footer",
    label: "15-Footer Challenge",
    icon: "⛳",
    reward: "Subtract 1 stroke from your team score on this hole",
    effect: -1,
    suggestedPars: [3, 4, 5],
  },
  {
    id: "beat_the_pro",
    label: "Beat the Pro",
    icon: "🏆",
    reward: "Subtract 2 strokes from your team score on this hole",
    effect: -2,
    suggestedPars: [3, 4, 5],
  },
  {
    id: "bragging_rights",
    label: "Bragging Rights",
    icon: "🤙",
    reward: "No stroke change — glory only",
    effect: 0,
    suggestedPars: [3, 4, 5],
  },
];

export const challengeTypeById = (id) => CHALLENGE_TYPES.find((c) => c.id === id);

/** Stroke change a team gets on a hole for winning its challenge. */
export function challengeAdjustment(team, hole, holes = []) {
  const h = holes.find((x) => x.hole_number === hole);
  if (!h || !h.challenge_effect) return 0;
  const won = (team?.challenge_wins || []).some((w) => w.hole_number === hole);
  if (!won) return 0;
  return h.is_jackpot ? h.challenge_effect * 2 : h.challenge_effect;
}
