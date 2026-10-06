export type Line = "BX" | "UX" | "CX";
export type BeyType = "attack" | "defense" | "stamina" | "balance";
export type PartKind =
  | "blade"
  | "ratchet"
  | "bit"
  | "lock_chip"
  | "main_blade"
  | "assist_blade"
  | "metal_blade"
  | "over_blade";

/** Official Takara Tomy stat values as printed on the wiki (scale differs per part kind). */
export type OfficialStats = Partial<Record<"attack" | "defense" | "stamina" | "dash" | "burst" | "height", number>>;

export interface ScrapedPart {
  slug: string;
  kind: PartKind;
  name: string;
  abbr: string | null;
  line: Line | null;
  codes: string[];
  type: BeyType | null;
  type_source: "wiki" | "stock_product" | "official_stats" | null;
  weight_g: number | null;
  spin: "right" | "left" | "dual" | null;
  protrusions: number | null;
  height: number | null; // ratchet height in mm (from the name, e.g. 4-80 → 8.0) or bit height in mm
  official: OfficialStats;
  behaviour: string | null;
  description: string | null;
  release_date: string | null;
  image_url: string | null;
  image_original?: string | null;
  image_pixel?: string | null;
  gimmick: boolean;
  source_url: string;
}

export interface ScrapedProduct {
  slug: string;
  code: string;
  name: string;
  product_type: "Starter" | "Booster" | "Random Booster" | "Set" | "Other";
  line: Line | null;
  type: BeyType | null;
  spin: "right" | "left" | null;
  weight_g: number | null;
  release_date: string | null;
  notes: string | null;
  description: string | null;
  image_url: string | null;
  image_original?: string | null;
  image_pixel?: string | null;
  source_url: string;
  contents: { slug: string; qty: number }[];
}
