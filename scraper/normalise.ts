// Derived fields and curated data, applied after parsing. Nothing here invents stats: types come from the wiki,
// from the stock product a part ships in, or (last resort) from the part's own official stat values.
import { readFileSync } from "node:fs";
import type { BeyType, ScrapedPart, ScrapedProduct } from "./types";
import type { Snapshot } from "./index";

type BitProfile = { behaviour: string; gimmick?: boolean };
const bitProfiles: Record<string, BitProfile> = JSON.parse(readFileSync("data/bitProfiles.json", "utf8"));
const overrides: { parts: Record<string, Partial<ScrapedPart>>; products: Record<string, Partial<ScrapedProduct>> } =
  JSON.parse(readFileSync("data/overrides.json", "utf8"));

const BEHAVIOUR_FROM_TYPE: Record<BeyType, string> = {
  attack: "aggressive",
  defense: "centre",
  stamina: "centre",
  balance: "balanced",
};

/** Highest of attack/defense/stamina official values; balance when the top two are close. */
export function typeFromOfficial(o: ScrapedPart["official"]): BeyType | null {
  const entries = (["attack", "defense", "stamina"] as const)
    .map((k) => [k, o[k]] as const)
    .filter((e): e is readonly [BeyType & ("attack" | "defense" | "stamina"), number] => typeof e[1] === "number");
  if (entries.length < 3) return null;
  entries.sort((a, b) => b[1] - a[1]);
  if (entries[0][1] - entries[1][1] <= 3) return "balance";
  return entries[0][0];
}

export function enrich(s: Snapshot): Snapshot {
  const bySlug = new Map(s.parts.map((p) => [p.slug, p]));

  // Single-Bey products give their blade (or CX main blade) a type, and spin if the part page didn't.
  for (const product of s.products) {
    if (!product.type || product.product_type === "Set") continue;
    for (const c of product.contents) {
      const p = bySlug.get(c.slug);
      if (!p || !["blade", "main_blade", "metal_blade"].includes(p.kind)) continue;
      if (!p.type) {
        p.type = product.type;
        p.type_source = "stock_product";
      }
      if (!p.spin && product.spin) p.spin = product.spin;
    }
  }

  for (const p of s.parts) {
    if (!p.type && ["blade", "main_blade", "metal_blade", "bit"].includes(p.kind)) {
      const t = typeFromOfficial(p.official);
      if (t) {
        p.type = t;
        p.type_source = "official_stats";
      }
    }
    if (p.kind === "bit") {
      const prof = p.abbr ? bitProfiles[p.abbr] : undefined;
      p.behaviour = prof?.behaviour ?? (p.type ? BEHAVIOUR_FROM_TYPE[p.type] : null);
      p.gimmick = !!prof?.gimmick;
    }
    // UX/CX blades are built around a gimmick (metal contact points, swappable pieces).
    if (["blade", "main_blade", "metal_blade", "assist_blade"].includes(p.kind) && (p.line === "UX" || p.line === "CX")) {
      p.gimmick = true;
    }
    Object.assign(p, overrides.parts[p.slug] ?? {});
  }
  for (const pr of s.products) Object.assign(pr, overrides.products[pr.slug] ?? {});

  s.parts.sort((a, b) => a.slug.localeCompare(b.slug));
  s.products.sort((a, b) => a.code.localeCompare(b.code) || a.slug.localeCompare(b.slug));
  return s;
}
