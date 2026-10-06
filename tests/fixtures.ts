import type { Part } from "@/lib/types";

/** Minimal part factory for tests. */
export function part(p: Partial<Part> & Pick<Part, "slug" | "kind" | "name">): Part {
  return {
    abbr: null,
    line: "BX",
    codes: [],
    type: null,
    type_source: null,
    weight_g: null,
    spin: null,
    contact_points: null,
    protrusions: null,
    height: null,
    official: {},
    behaviour: null,
    gimmick: false,
    description: null,
    release_date: null,
    image_original: null,
    image_pixel: null,
    source_url: null,
    ...p,
  };
}

export const catalog: Part[] = [
  part({ slug: "dran-sword-blade", kind: "blade", name: "Dran Sword", type: "attack", weight_g: 35, official: { attack: 60, defense: 20, stamina: 20 } }),
  part({ slug: "wizard-arrow-blade", kind: "blade", name: "Wizard Arrow", type: "stamina", weight_g: 31.8, official: { attack: 15, defense: 30, stamina: 55 } }),
  part({ slug: "knight-shield-blade", kind: "blade", name: "Knight Shield", type: "defense", weight_g: 33, official: { attack: 20, defense: 55, stamina: 25 } }),
  part({ slug: "brave-main-blade", kind: "main_blade", name: "Brave", line: "CX", type: "attack", weight_g: 31.1, official: { attack: 40, defense: 10, stamina: 10 } }),
  part({ slug: "slash-assist-blade", kind: "assist_blade", name: "Slash", line: "CX", weight_g: 4.65, official: { attack: 10, defense: 20, stamina: 10, height: 50 } }),
  part({ slug: "dran-lock-chip", kind: "lock_chip", name: "Dran", line: "CX", weight_g: 1.9 }),
  part({ slug: "3-60-ratchet", kind: "ratchet", name: "3-60", protrusions: 3, height: 6, weight_g: 6.5, official: { attack: 14, defense: 8, stamina: 8 } }),
  part({ slug: "4-80-ratchet", kind: "ratchet", name: "4-80", protrusions: 4, height: 8, weight_g: 7, official: { attack: 11, defense: 11, stamina: 8 } }),
  part({ slug: "flat-bit", kind: "bit", name: "Flat", abbr: "F", type: "attack", behaviour: "aggressive", weight_g: 2, official: { attack: 40, defense: 10, stamina: 10, dash: 35, burst: 80 } }),
  part({ slug: "ball-bit", kind: "bit", name: "Ball", abbr: "B", type: "stamina", behaviour: "centre", weight_g: 2.1, official: { attack: 15, defense: 25, stamina: 50, dash: 10, burst: 30 } }),
  part({ slug: "needle-bit", kind: "bit", name: "Needle", abbr: "N", type: "defense", behaviour: "centre", weight_g: 2, official: { attack: 10, defense: 50, stamina: 30, dash: 10, burst: 30 } }),
  part({ slug: "quake-bit", kind: "bit", name: "Quake", abbr: "Q", type: "attack", behaviour: "unpredictable", gimmick: true, weight_g: 2, official: { attack: 45, defense: 10, stamina: 5, dash: 40, burst: 60 } }),
];
