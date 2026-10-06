import { describe, expect, it } from "vitest";
import { buildContext, resolveCombo, scoreCombo } from "@/lib/scoring/score";
import { catalog, part } from "./fixtures";

const ctx = buildContext(catalog);
const bySlug = new Map(catalog.map((p) => [p.slug, p]));
const score = (parts: Record<string, string>) => scoreCombo(resolveCombo(parts, bySlug), ctx);

describe("scoreCombo", () => {
  it("rates an attack build as Attack with high attack", () => {
    const s = score({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "flat-bit" });
    expect(s.type).toBe("attack");
    expect(s.attack).toBeGreaterThan(s.stamina);
    expect(s.total).toBeGreaterThan(0);
    expect(s.total).toBeLessThanOrEqual(999);
  });

  it("rates a stamina build as Stamina", () => {
    const s = score({ blade: "wizard-arrow-blade", ratchet: "4-80-ratchet", bit: "ball-bit" });
    expect(s.type).toBe("stamina");
  });

  it("swapping to an aggressive bit raises attack and chaos", () => {
    const calm = score({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "ball-bit" });
    const wild = score({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "flat-bit" });
    expect(wild.attack).toBeGreaterThan(calm.attack);
    expect(wild.chaos).toBeGreaterThan(calm.chaos);
  });

  it("gimmick bits add chaos and are listed", () => {
    const s = score({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "quake-bit" });
    expect(s.gimmicks).toContain("Quake Bit");
    expect(s.chaos).toBeGreaterThanOrEqual(70);
  });

  it("scores CX pieces", () => {
    const s = score({ lock_chip: "dran-lock-chip", main_blade: "brave-main-blade", assist_blade: "slash-assist-blade", ratchet: "3-60-ratchet", bit: "flat-bit" });
    expect(s.type).toBe("attack");
    expect(s.confidence).toBe(100);
  });

  it("lowers confidence and explains when data is missing", () => {
    const mystery = part({ slug: "mystery-blade", kind: "blade", name: "Mystery", type: "attack" });
    const map = new Map(bySlug).set(mystery.slug, mystery);
    const s = scoreCombo(resolveCombo({ blade: "mystery-blade", ratchet: "3-60-ratchet", bit: "flat-bit" }, map), ctx);
    expect(s.confidence).toBeLessThan(70);
    expect(s.notes.join(" ")).toMatch(/weight unknown/i);
    expect(s.notes[0]).toMatch(/low confidence/i);
  });

  it("uses the attack weighting for attackTotal", () => {
    const atk = score({ blade: "dran-sword-blade", ratchet: "3-60-ratchet", bit: "flat-bit" });
    const sta = score({ blade: "wizard-arrow-blade", ratchet: "4-80-ratchet", bit: "ball-bit" });
    expect(atk.attackTotal - atk.total).toBeGreaterThan(sta.attackTotal - sta.total);
  });
});
