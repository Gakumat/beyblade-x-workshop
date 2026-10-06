// Type triangle, illustrative battle outcomes, and "beat a collection" recommendations.
import type { BeyType, ComboParts, Part, Product, ProductContent } from "./types";
import { buildContext, resolveCombo, scoreCombo, isComplete, type ComboScore, type ScoreContext } from "./scoring/score";

/** Attack > Stamina > Defense > Attack. Balance is middling against everything. */
const BEATS: Record<BeyType, BeyType | null> = { attack: "stamina", stamina: "defense", defense: "attack", balance: null };

/** +1 if a has the type advantage over b, -1 if b has it, 0 otherwise. */
export function advantage(a: BeyType, b: BeyType): number {
  if (BEATS[a] === b) return 1;
  if (BEATS[b] === a) return -1;
  return 0;
}

export function advantageText(a: BeyType, b: BeyType, nameA = "Left", nameB = "Right") {
  const adv = advantage(a, b);
  if (adv > 0) return `${nameA} has the type edge (${cap(a)} beats ${cap(b)})`;
  if (adv < 0) return `${nameB} has the type edge (${cap(b)} beats ${cap(a)})`;
  return "Neither has a type advantage";
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---------- Battle (illustrative only) ----------

export type Finish = "Xtreme" | "Over" | "Burst" | "Spin";
export const FINISH_POINTS: Record<Finish, number> = { Xtreme: 3, Burst: 2, Over: 2, Spin: 1 };

/** Small deterministic PRNG so a given seed always replays the same battle. */
export function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function winChance(a: ComboScore, b: ComboScore) {
  const p = 0.5 + 0.2 * advantage(a.type, b.type) + (a.total - b.total) / 2000;
  return Math.max(0.1, Math.min(0.9, p));
}

export interface BattleResult {
  winner: 0 | 1;
  finish: Finish;
  points: number;
  chance: number;
}

/** One round. The winner's style decides how it wins; low burst resistance on the loser makes Burst likelier. */
export function battle(a: ComboScore, b: ComboScore, seed: number): BattleResult {
  const r = rng(seed);
  const chance = winChance(a, b);
  const winner: 0 | 1 = r() < chance ? 0 : 1;
  const w = winner === 0 ? a : b;
  const l = winner === 0 ? b : a;
  const burstOdds = l.burst == null ? 0.15 : Math.max(0.05, (60 - l.burst) / 100);
  const weights: [Finish, number][] = [
    ["Burst", burstOdds],
    ["Xtreme", w.type === "attack" ? 0.35 : 0.1],
    ["Over", w.type === "attack" || w.type === "defense" ? 0.35 : 0.2],
    ["Spin", w.type === "stamina" ? 0.5 : w.type === "balance" ? 0.3 : 0.15],
  ];
  let roll = r() * weights.reduce((t, [, x]) => t + x, 0);
  let finish: Finish = "Spin";
  for (const [f, x] of weights) {
    if ((roll -= x) <= 0) {
      finish = f;
      break;
    }
  }
  return { winner, finish, points: FINISH_POINTS[finish], chance };
}

// ---------- Combos from a set of parts ----------

export interface RankedCombo {
  parts: ComboParts;
  score: ComboScore;
}

/** Every buildable combo from a pool of parts. CX blades use any owned lock chip (it doesn't affect stats). */
export function allCombos(pool: Part[], ctx: ScoreContext): RankedCombo[] {
  const by = (k: string) => pool.filter((p) => p.kind === k);
  const blades: ComboParts[] = by("blade").map((b) => ({ blade: b.slug }));
  const lock = by("lock_chip")[0]?.slug ?? null;
  for (const m of [...by("main_blade"), ...by("metal_blade")]) {
    const assists = m.kind === "main_blade" ? by("assist_blade") : by("over_blade");
    const key = m.kind === "main_blade" ? "assist_blade" : "over_blade";
    for (const a of assists.length ? assists : [null]) blades.push({ lock_chip: lock, [m.kind]: m.slug, [key]: a?.slug ?? null });
  }
  const bySlug = new Map(pool.map((p) => [p.slug, p]));
  const out: RankedCombo[] = [];
  for (const b of blades)
    for (const r of by("ratchet"))
      for (const t of by("bit")) {
        const parts = { ...b, ratchet: r.slug, bit: t.slug };
        const resolved = resolveCombo(parts, bySlug);
        if (isComplete(resolved)) out.push({ parts, score: scoreCombo(resolved, ctx) });
      }
  return out;
}

/** The stock combo a single-Bey product ships as (null for sets with several Beys). */
export function stockCombo(product: Product, contents: ProductContent[], bySlug: Map<string, Part>): ComboParts | null {
  const parts = contents
    .filter((c) => c.product_slug === product.slug)
    .map((c) => bySlug.get(c.part_slug))
    .filter((p): p is Part => !!p);
  const one = (k: string) => {
    const xs = parts.filter((p) => p.kind === k);
    return xs.length === 1 ? xs[0].slug : xs.length === 0 ? null : undefined;
  };
  const combo: ComboParts = {};
  for (const k of ["blade", "lock_chip", "main_blade", "assist_blade", "metal_blade", "over_blade", "ratchet", "bit"] as const) {
    const v = one(k);
    if (v === undefined) return null; // several of one kind: a multi-Bey set
    if (v) combo[k] = v;
  }
  return combo.ratchet && combo.bit && (combo.blade || combo.main_blade || combo.metal_blade) ? combo : null;
}

// ---------- Recommendations ----------

export interface Recommendation {
  product: Product;
  combo: ComboParts;
  score: ComboScore;
  reason: string;
  value: number;
}

export function productCombos(products: Product[], contents: ProductContent[], parts: Part[], ctx = buildContext(parts)) {
  const bySlug = new Map(parts.map((p) => [p.slug, p]));
  const out: { product: Product; combo: ComboParts; score: ComboScore }[] = [];
  for (const product of products) {
    const combo = stockCombo(product, contents, bySlug);
    if (!combo) continue;
    out.push({ product, combo, score: scoreCombo(resolveCombo(combo, bySlug), ctx) });
  }
  return out;
}

/** Products whose stock combo has the type edge over an owner's strongest combos (score breaks ties). */
export function beatCollection(
  ownerParts: Part[],
  candidates: { product: Product; combo: ComboParts; score: ComboScore }[],
  ctx: ScoreContext,
  ownerName: string,
  topN = 5,
): { recs: Recommendation[]; lean: BeyType | null; top: RankedCombo[] } {
  const top = allCombos(ownerParts, ctx)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, topN);
  if (!top.length) return { recs: [], lean: null, top };

  const mix: Record<BeyType, number> = { attack: 0, defense: 0, stamina: 0, balance: 0 };
  for (const c of top) mix[c.score.type] += c.score.total;
  const sum = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
  const lean = (Object.entries(mix).sort((a, b) => b[1] - a[1])[0][0] as BeyType) ?? null;

  const recs = candidates
    .map(({ product, combo, score }) => {
      const adv = (Object.keys(mix) as BeyType[]).reduce((t, k) => t + (mix[k] / sum) * advantage(score.type, k), 0);
      const value = adv * 100 + score.total / 10;
      const reason =
        adv > 0.2
          ? `${ownerName}'s collection leans ${cap(lean)}, so this ${cap(score.type)} type has the edge.`
          : adv < -0.2
            ? `Risky pick: ${ownerName}'s ${cap(lean)} combos have the type edge, but this one hits ${score.total} points.`
            : `No clear type edge over ${ownerName}'s ${cap(lean)} lean, but it scores a strong ${score.total} points.`;
      return { product, combo, score, reason, value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  return { recs, lean, top };
}
