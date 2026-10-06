// "What's missing" for an owner: simple coverage checks across type, movement, ratchet height and line.
import type { BeyType, Part, Product, ProductContent } from "./types";

export interface Gap {
  label: string;
  why: string;
  suggestion?: Product;
}

const TYPES: BeyType[] = ["attack", "defense", "stamina", "balance"];

export function findGaps(ownedParts: Part[], allParts: Part[], products: Product[], contents: ProductContent[]): Gap[] {
  const gaps: Gap[] = [];
  const owned = new Set(ownedParts.map((p) => p.slug));
  const blades = ownedParts.filter((p) => ["blade", "main_blade", "metal_blade"].includes(p.kind));
  const bits = ownedParts.filter((p) => p.kind === "bit");
  const ratchets = ownedParts.filter((p) => p.kind === "ratchet");

  // First single-Bey product that contains a part matching `want` the owner doesn't have.
  const suggest = (want: (p: Part) => boolean) => {
    const target = new Set(allParts.filter((p) => want(p) && !owned.has(p.slug)).map((p) => p.slug));
    const hit = contents.find((c) => target.has(c.part_slug));
    return hit ? products.find((p) => p.slug === hit.product_slug) : undefined;
  };

  for (const t of TYPES.slice(0, 3)) {
    if (!blades.some((b) => b.type === t))
      gaps.push({ label: `No ${t} blade`, why: `Every type needs a blade to build around.`, suggestion: suggest((p) => p.kind === "blade" && p.type === t) });
    if (!bits.some((b) => b.type === t))
      gaps.push({ label: `No ${t} bit`, why: `The bit decides how a combo moves.`, suggestion: suggest((p) => p.kind === "bit" && p.type === t) });
  }
  if (!bits.some((b) => b.behaviour === "aggressive"))
    gaps.push({ label: "No aggressive bit", why: "Flat or Rush-style bits are what let attack combos hunt.", suggestion: suggest((p) => p.kind === "bit" && p.behaviour === "aggressive") });
  if (!bits.some((b) => b.gimmick))
    gaps.push({ label: "No gimmick bit", why: "Gimmick bits add chaos and fun.", suggestion: suggest((p) => p.kind === "bit" && p.gimmick) });
  if (!ratchets.some((r) => (r.height ?? 99) <= 6))
    gaps.push({ label: "No low ratchet (≤60)", why: "Low ratchets help smash and upper attack.", suggestion: suggest((p) => p.kind === "ratchet" && (p.height ?? 99) <= 6) });
  if (!ratchets.some((r) => (r.height ?? 0) >= 8))
    gaps.push({ label: "No tall ratchet (80+)", why: "Tall ratchets suit stamina builds.", suggestion: suggest((p) => p.kind === "ratchet" && (p.height ?? 0) >= 8) });
  for (const line of ["UX", "CX"] as const)
    if (!ownedParts.some((p) => p.line === line))
      gaps.push({ label: `Nothing from ${line}`, why: line === "CX" ? "CX blades are built from swappable pieces." : "UX parts have unique gimmicks.", suggestion: suggest((p) => p.line === line && (p.kind === "blade" || p.kind === "main_blade")) });
  return gaps;
}
