// Combo scoring: a pure function of the parts and a catalogue context. See /scoring for the plain-English version.
import { scoringConfig as C, type ScoringConfig } from "./config";
import type { BeyType, ComboParts, Part, PartKind } from "../types";

type Stat = "attack" | "defense" | "stamina";
const STATS: Stat[] = ["attack", "defense", "stamina"];

export interface ScoreContext {
  /** Best official value per kind per stat, used to normalise to 0–1. */
  max: Partial<Record<PartKind, Partial<Record<Stat | "burst" | "dash", number>>>>;
  medianBladeWeight: number | null;
}

export interface ComboScore {
  attack: number;
  defense: number;
  stamina: number;
  burst: number | null;
  chaos: number;
  type: BeyType;
  total: number;
  attackTotal: number;
  confidence: number;
  notes: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  gimmicks: string[];
  weight: number | null;
}

/** Build the normalisation context once per catalogue. */
export function buildContext(parts: Part[]): ScoreContext {
  const max: ScoreContext["max"] = {};
  for (const p of parts) {
    const m = (max[p.kind] ??= {});
    for (const k of ["attack", "defense", "stamina", "burst", "dash"] as const) {
      const v = p.official?.[k];
      if (typeof v === "number" && v > (m[k] ?? 0)) m[k] = v;
    }
  }
  const weights = parts
    .filter((p) => (p.kind === "blade" || p.kind === "main_blade") && p.weight_g)
    .map((p) => p.weight_g!)
    .sort((a, b) => a - b);
  return { max, medianBladeWeight: weights.length ? weights[Math.floor(weights.length / 2)] : null };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** 0–1 profile of one part: official stats against the best of its kind, or the type fallback. */
function profile(p: Part, ctx: ScoreContext, cfg: ScoringConfig): { v: Record<Stat, number>; official: boolean } {
  const m = ctx.max[p.kind] ?? {};
  const has = STATS.every((s) => typeof p.official?.[s] === "number") && STATS.some((s) => (m[s] ?? 0) > 0);
  if (has) {
    const v = Object.fromEntries(STATS.map((s) => [s, (p.official[s] ?? 0) / (m[s] || 1)])) as Record<Stat, number>;
    return { v, official: true };
  }
  return { v: { ...cfg.typeFallback[p.type ?? "unknown"] }, official: false };
}

export type ResolvedCombo = Partial<Record<PartKind, Part>>;

export function resolveCombo(parts: ComboParts, bySlug: Map<string, Part>): ResolvedCombo {
  const out: ResolvedCombo = {};
  for (const [k, slug] of Object.entries(parts)) {
    const p = slug ? bySlug.get(slug) : undefined;
    if (p) out[k as PartKind] = p;
  }
  return out;
}

export function isComplete(c: ResolvedCombo) {
  const blade = c.blade || c.main_blade || c.metal_blade;
  return !!(blade && c.ratchet && c.bit);
}

export function scoreCombo(combo: ResolvedCombo, ctx: ScoreContext, cfg: ScoringConfig = C): ComboScore {
  const notes: string[] = [];
  let confidence = 100;
  const pen = cfg.confidencePenalty;

  // --- Blade slot (one-piece or CX pieces) ---
  const bladeVal: Record<Stat, number> = { attack: 0, defense: 0, stamina: 0 };
  let bladeOfficial = true;
  const bladeParts: Part[] = [];
  if (combo.blade) {
    const pr = profile(combo.blade, ctx, cfg);
    STATS.forEach((s) => (bladeVal[s] = pr.v[s]));
    bladeOfficial = pr.official;
    bladeParts.push(combo.blade);
  } else {
    let share = 0;
    for (const k of ["main_blade", "metal_blade", "assist_blade", "over_blade"] as const) {
      const p = combo[k];
      if (!p) continue;
      const w = cfg.cxPieceShare[k];
      const pr = profile(p, ctx, cfg);
      STATS.forEach((s) => (bladeVal[s] += pr.v[s] * w));
      share += w;
      bladeOfficial &&= pr.official;
      bladeParts.push(p);
    }
    if (share > 0) STATS.forEach((s) => (bladeVal[s] /= share));
    if (combo.lock_chip) bladeParts.push(combo.lock_chip);
  }
  if (!bladeOfficial) {
    confidence -= pen.noOfficialBlade;
    notes.push("Blade has no official stats, so its type was used instead.");
  }

  const ratchet = combo.ratchet ? profile(combo.ratchet, ctx, cfg) : null;
  const bit = combo.bit ? profile(combo.bit, ctx, cfg) : null;
  if (ratchet && !ratchet.official) {
    confidence -= pen.noOfficialRatchet;
    notes.push("Ratchet has no official stats.");
  }
  if (bit && !bit.official) {
    confidence -= pen.noOfficialBit;
    notes.push("Bit has no official stats, so its type was used instead.");
  }

  // --- Weighted sum of slots, scaled to 0–100 ---
  const w = cfg.slotWeights;
  const sub: Record<Stat | "chaos", number> = { attack: 0, defense: 0, stamina: 0, chaos: 0 };
  for (const s of STATS) {
    sub[s] = 100 * (w.blade * bladeVal[s] + w.ratchet * (ratchet?.v[s] ?? 0.4) + w.bit * (bit?.v[s] ?? 0.4));
  }

  // --- Weight ---
  const bladeWeight = bladeParts.reduce((t, p) => t + (p.weight_g ?? 0), 0) || null;
  const totalWeight =
    bladeWeight && combo.ratchet?.weight_g && combo.bit?.weight_g
      ? Math.round((bladeWeight + combo.ratchet.weight_g + combo.bit.weight_g) * 10) / 10
      : null;
  const bladeMain = combo.blade ?? combo.main_blade ?? combo.metal_blade;
  if (bladeMain?.weight_g && ctx.medianBladeWeight) {
    const bonus = clamp((bladeMain.weight_g - ctx.medianBladeWeight) * cfg.weightPointsPerGram, -cfg.weightCap, cfg.weightCap);
    sub.attack += bonus;
    sub.defense += bonus;
  } else {
    confidence -= pen.noBladeWeight;
    notes.push("Blade weight unknown.");
  }

  // --- Ratchet height ---
  const h = combo.ratchet?.height;
  if (h != null) {
    if (h <= cfg.lowRatchet.maxHeight) sub.attack += cfg.lowRatchet.attack;
    if (h >= cfg.tallRatchet.minHeight) {
      sub.stamina += cfg.tallRatchet.stamina;
      sub.attack += cfg.tallRatchet.attack;
    }
  }

  // --- Bit behaviour & chaos ---
  const gimmicks: string[] = [];
  const beh = combo.bit?.behaviour ? cfg.behaviour[combo.bit.behaviour] : undefined;
  if (beh) {
    sub.attack += beh.attack ?? 0;
    sub.defense += beh.defense ?? 0;
    sub.stamina += beh.stamina ?? 0;
    sub.chaos += beh.chaos ?? 0;
  }
  if (combo.bit?.gimmick) {
    sub.chaos += cfg.chaos.gimmickBit;
    gimmicks.push(`${combo.bit.name} Bit`);
  }
  for (const p of bladeParts) {
    if (p.gimmick && p.kind !== "lock_chip") {
      sub.chaos += cfg.chaos.gimmickBlade;
      gimmicks.push(`${p.name} (${p.line})`);
      break;
    }
  }
  const dash = combo.bit?.official?.dash;
  if (typeof dash === "number") sub.chaos += dash * cfg.chaos.dashPerPoint;

  // --- Burst resistance ---
  let burst: number | null = null;
  const bitBurst = combo.bit?.official?.burst;
  const maxBurst = ctx.max.bit?.burst;
  if (typeof bitBurst === "number" && maxBurst) {
    burst = (100 * bitBurst) / maxBurst;
    if (combo.ratchet?.protrusions != null) burst = 0.8 * burst + 0.2 * (cfg.burst.protrusionBase + combo.ratchet.protrusions * cfg.burst.perProtrusion);
  } else if (combo.ratchet?.protrusions != null) {
    burst = cfg.burst.protrusionBase + combo.ratchet.protrusions * cfg.burst.perProtrusion;
    confidence -= pen.noBurst / 2;
    notes.push("Burst resistance estimated from ratchet teeth only.");
  } else {
    confidence -= pen.noBurst;
    notes.push("Burst resistance unknown.");
  }

  const attack = Math.round(clamp(sub.attack));
  const defense = Math.round(clamp(sub.defense));
  const stamina = Math.round(clamp(sub.stamina));
  const chaos = Math.round(clamp(sub.chaos));
  burst = burst == null ? null : Math.round(clamp(burst));

  // --- Overall type ---
  const ranked = (
    [
      ["attack", attack],
      ["defense", defense],
      ["stamina", stamina],
    ] as [BeyType, number][]
  ).sort((a, b) => b[1] - a[1]);
  const type: BeyType = ranked[0][1] - ranked[1][1] <= cfg.balanceMargin ? "balance" : ranked[0][0];

  const total = weighted({ attack, defense, stamina, burst: burst ?? 50, chaos }, cfg.totalWeights, cfg.pointsScale);
  const attackTotal = weighted({ attack, defense, stamina, burst: burst ?? 50, chaos }, cfg.attackWeights, cfg.pointsScale);

  const { summary, strengths, weaknesses } = describe({ attack, defense, stamina, burst, chaos, type }, combo);
  if (confidence < 70) notes.unshift(`Low confidence (${Math.max(0, confidence)}%).`);

  return {
    attack,
    defense,
    stamina,
    burst,
    chaos,
    type,
    total,
    attackTotal,
    confidence: Math.max(0, confidence),
    notes,
    summary,
    strengths,
    weaknesses,
    gimmicks,
    weight: totalWeight,
  };
}

function weighted(s: Record<string, number>, w: Record<string, number>, scale: number) {
  const sum = Object.entries(w).reduce((t, [k, v]) => t + v * (s[k] ?? 0), 0);
  return Math.round((sum / 100) * scale);
}

const LABEL: Record<string, string> = {
  attack: "hitting hard",
  defense: "taking hits",
  stamina: "spinning a long time",
  burst: "not bursting",
  chaos: "chaotic, unpredictable movement",
};

function describe(
  s: { attack: number; defense: number; stamina: number; burst: number | null; chaos: number; type: BeyType },
  combo: ResolvedCombo,
) {
  const entries = Object.entries({ attack: s.attack, defense: s.defense, stamina: s.stamina, burst: s.burst ?? -1, chaos: s.chaos }).filter(
    ([, v]) => v >= 0,
  );
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strengths = sorted.filter(([, v]) => v >= 55).slice(0, 2).map(([k]) => LABEL[k]);
  const weaknesses = sorted
    .filter(([k, v]) => v < 40 && k !== "chaos")
    .slice(-2)
    .map(([k]) => LABEL[k]);

  const move: Record<string, string> = {
    aggressive: "It will race around the stadium looking for hits",
    centre: "It will settle in the middle and wait for the opponent to come to it",
    unpredictable: "It will move unpredictably, which makes it hard to plan against",
    balanced: "It moves a bit, then settles down",
  };
  const style: Record<BeyType, string> = {
    attack: "An Attack combo built to knock opponents out fast.",
    defense: "A Defense combo that soaks up hits and pushes attackers away.",
    stamina: "A Stamina combo that aims to outspin the opponent.",
    balance: "A Balance combo that can do a bit of everything.",
  };
  const parts = [style[s.type]];
  if (combo.bit?.behaviour && move[combo.bit.behaviour]) parts.push(move[combo.bit.behaviour] + ".");
  if (strengths.length) parts.push(`Best at ${strengths.join(" and ")}.`);
  if (weaknesses.length) parts.push(`Weaker at ${weaknesses.join(" and ")}.`);
  return { summary: parts.join(" "), strengths, weaknesses };
}
