import { describe, expect, it } from "vitest";
import { advantage, allCombos, battle, beatCollection, stockCombo, winChance } from "@/lib/matchup";
import { buildContext, resolveCombo, scoreCombo } from "@/lib/scoring/score";
import type { Product } from "@/lib/types";
import { catalog } from "./fixtures";

const ctx = buildContext(catalog);
const bySlug = new Map(catalog.map((p) => [p.slug, p]));
const s = (parts: Record<string, string>) => scoreCombo(resolveCombo(parts, bySlug), ctx);
const attack = s({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "flat-bit" });
const stamina = s({ blade: "wizard-arrow-blade", ratchet: "4-80-ratchet", bit: "ball-bit" });

describe("type triangle", () => {
  it("Attack > Stamina > Defense > Attack, Balance neutral", () => {
    expect(advantage("attack", "stamina")).toBe(1);
    expect(advantage("stamina", "defense")).toBe(1);
    expect(advantage("defense", "attack")).toBe(1);
    expect(advantage("stamina", "attack")).toBe(-1);
    expect(advantage("balance", "attack")).toBe(0);
    expect(advantage("attack", "attack")).toBe(0);
  });
});

describe("battle", () => {
  it("is deterministic per seed", () => {
    expect(battle(attack, stamina, 42)).toEqual(battle(attack, stamina, 42));
  });
  it("favours the type advantage, within 10–90%", () => {
    const p = winChance(attack, stamina);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThanOrEqual(0.9);
    expect(winChance(stamina, attack)).toBeLessThan(0.5);
  });
  it("wins roughly in line with the odds", () => {
    let wins = 0;
    for (let i = 0; i < 2000; i++) if (battle(attack, stamina, i).winner === 0) wins++;
    expect(wins / 2000).toBeGreaterThan(winChance(attack, stamina) - 0.05);
  });
});

describe("combos and recommendations", () => {
  it("builds every combo from a pool, including CX", () => {
    const all = allCombos(catalog, ctx);
    // 3 one-piece blades + 1 CX main×assist, × 2 ratchets × 4 bits
    expect(all).toHaveLength(4 * 2 * 4);
    expect(all.some((c) => c.parts.main_blade === "brave-main-blade")).toBe(true);
  });

  it("finds the stock combo of a single-Bey product, and none for multi-Bey sets", () => {
    const product = { slug: "dran-sword", code: "BX-01" } as Product;
    const set = { slug: "deck", code: "BX-08" } as Product;
    const contents = [
      { product_slug: "dran-sword", part_slug: "dran-sword-blade", qty: 1 },
      { product_slug: "dran-sword", part_slug: "3-60-ratchet", qty: 1 },
      { product_slug: "dran-sword", part_slug: "flat-bit", qty: 1 },
      { product_slug: "deck", part_slug: "dran-sword-blade", qty: 1 },
      { product_slug: "deck", part_slug: "wizard-arrow-blade", qty: 1 },
      { product_slug: "deck", part_slug: "3-60-ratchet", qty: 1 },
      { product_slug: "deck", part_slug: "flat-bit", qty: 1 },
    ];
    expect(stockCombo(product, contents, bySlug)).toEqual({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "flat-bit" });
    expect(stockCombo(set, contents, bySlug)).toBeNull();
  });

  it("recommends a counter to a stamina-heavy collection", () => {
    const owner = catalog.filter((p) => ["wizard-arrow-blade", "4-80-ratchet", "ball-bit"].includes(p.slug));
    const candidates = [
      { product: { slug: "atk", name: "Attacker" } as Product, combo: {}, score: attack },
      { product: { slug: "sta", name: "Stamina" } as Product, combo: {}, score: stamina },
    ];
    const { recs, lean } = beatCollection(owner, candidates, ctx, "Sam");
    expect(lean).toBe("stamina");
    expect(recs[0].product.slug).toBe("atk");
    expect(recs[0].reason).toMatch(/leans Stamina, so this Attack type has the edge/);
  });
});
