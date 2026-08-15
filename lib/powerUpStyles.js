// Card colour tokens + eligibility rules shared by the admin editor and the
// player-facing cards.
//
// NOTE: every Tailwind class here is written out in full on purpose — Tailwind
// scans source text, so template-built class names ("bg-" + c + "-300") would
// get stripped from the production build.

export const CARD_COLORS = {
  lime: {
    label: "Lime",
    dot: "bg-lime-300",
    ring: "border-lime-300/45",
    glow: "shadow-[0_0_0_1px_rgba(190,242,100,0.25)]",
    tint: "bg-lime-300/12",
    text: "text-lime-300",
    chip: "bg-lime-300/20 text-lime-200",
    btn: "bg-lime-300 hover:bg-lime-200 text-emerald-950",
  },
  amber: {
    label: "Amber",
    dot: "bg-amber-300",
    ring: "border-amber-300/45",
    glow: "shadow-[0_0_0_1px_rgba(252,211,77,0.25)]",
    tint: "bg-amber-300/12",
    text: "text-amber-300",
    chip: "bg-amber-300/20 text-amber-200",
    btn: "bg-amber-300 hover:bg-amber-200 text-stone-900",
  },
  rose: {
    label: "Rose",
    dot: "bg-rose-400",
    ring: "border-rose-400/45",
    glow: "shadow-[0_0_0_1px_rgba(251,113,133,0.25)]",
    tint: "bg-rose-400/12",
    text: "text-rose-300",
    chip: "bg-rose-400/20 text-rose-200",
    btn: "bg-rose-400 hover:bg-rose-300 text-stone-900",
  },
  sky: {
    label: "Sky",
    dot: "bg-sky-400",
    ring: "border-sky-400/45",
    glow: "shadow-[0_0_0_1px_rgba(56,189,248,0.25)]",
    tint: "bg-sky-400/12",
    text: "text-sky-300",
    chip: "bg-sky-400/20 text-sky-200",
    btn: "bg-sky-400 hover:bg-sky-300 text-stone-900",
  },
  violet: {
    label: "Violet",
    dot: "bg-violet-400",
    ring: "border-violet-400/45",
    glow: "shadow-[0_0_0_1px_rgba(167,139,250,0.25)]",
    tint: "bg-violet-400/12",
    text: "text-violet-300",
    chip: "bg-violet-400/20 text-violet-200",
    btn: "bg-violet-400 hover:bg-violet-300 text-stone-900",
  },
  orange: {
    label: "Orange",
    dot: "bg-orange-400",
    ring: "border-orange-400/45",
    glow: "shadow-[0_0_0_1px_rgba(251,146,60,0.25)]",
    tint: "bg-orange-400/12",
    text: "text-orange-300",
    chip: "bg-orange-400/20 text-orange-200",
    btn: "bg-orange-400 hover:bg-orange-300 text-stone-900",
  },
};

export const COLOR_KEYS = Object.keys(CARD_COLORS);
export const colorOf = (key) => CARD_COLORS[key] || CARD_COLORS.lime;

// Default colour by kind — hazards lean warm, power-ups lean lime
export const defaultColorFor = (kind) => (kind === "hazard" ? "rose" : "lime");

export const isHazard = (card) => card?.kind === "hazard";

// Human-readable summary of where a card may be used
export function ruleLabel(card) {
  const holes = card?.allowed_holes || [];
  const pars = card?.allowed_pars || [];
  if (holes.length && pars.length) return `Holes ${holes.join(", ")} · par ${pars.join("/")}`;
  if (holes.length) return `Hole${holes.length > 1 ? "s" : ""} ${holes.join(", ")}`;
  if (pars.length) return `Par ${pars.join("/")} only`;
  return "Any hole";
}

/**
 * Can this card be claimed on this hole?
 * Mirrors the checks inside golf_use_power_up() so the UI can grey the
 * button out before the player taps it.
 */
export function eligibility(card, holeNumber, holes = []) {
  if (!card) return { ok: false, reason: "Unknown card" };
  if (card.enabled === false) return { ok: false, reason: "Switched off" };

  const allowedHoles = card.allowed_holes || [];
  if (allowedHoles.length && !allowedHoles.includes(holeNumber)) {
    return { ok: false, reason: `Hole ${allowedHoles.join(", ")} only` };
  }

  const allowedPars = card.allowed_pars || [];
  if (allowedPars.length) {
    const par = holes.find((h) => h.hole_number === holeNumber)?.par;
    if (par == null || !allowedPars.includes(par)) {
      return { ok: false, reason: `Par ${allowedPars.join("/")} only` };
    }
  }
  return { ok: true };
}
