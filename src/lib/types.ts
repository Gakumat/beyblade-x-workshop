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

export type OfficialStats = Partial<Record<"attack" | "defense" | "stamina" | "dash" | "burst" | "height", number>>;

export interface Part {
  slug: string;
  kind: PartKind;
  name: string;
  abbr: string | null;
  line: Line | null;
  codes: string[];
  type: BeyType | null;
  type_source: string | null;
  weight_g: number | null;
  spin: "right" | "left" | "dual" | null;
  contact_points: number | null;
  protrusions: number | null;
  height: number | null;
  official: OfficialStats;
  behaviour: string | null;
  gimmick: boolean;
  description: string | null;
  release_date: string | null;
  image_original: string | null;
  image_pixel: string | null;
  source_url: string | null;
}

export interface Product {
  slug: string;
  code: string;
  name: string;
  product_type: string;
  line: Line | null;
  type: BeyType | null;
  spin: string | null;
  weight_g: number | null;
  release_date: string | null;
  notes: string | null;
  description: string | null;
  image_original: string | null;
  image_pixel: string | null;
  source_url: string | null;
}

export interface ProductContent {
  product_slug: string;
  part_slug: string;
  qty: number;
}

export interface OwnedPart {
  part_slug: string;
  owner: string;
  qty: number;
}

/** A combo is a set of part slugs: one-piece blade, or CX pieces, plus ratchet and bit. */
export interface ComboParts {
  blade?: string | null;
  lock_chip?: string | null;
  main_blade?: string | null;
  assist_blade?: string | null;
  metal_blade?: string | null;
  over_blade?: string | null;
  ratchet?: string | null;
  bit?: string | null;
}

export interface SavedCombo {
  id: string;
  name: string;
  owner: string | null;
  parts: ComboParts;
  created_at: string;
}

export const KIND_LABEL: Record<PartKind, string> = {
  blade: "Blade",
  ratchet: "Ratchet",
  bit: "Bit",
  lock_chip: "Lock Chip",
  main_blade: "Main Blade",
  assist_blade: "Assist Blade",
  metal_blade: "Metal Blade",
  over_blade: "Over Blade",
};

export const TYPE_LABEL: Record<BeyType, string> = {
  attack: "Attack",
  defense: "Defense",
  stamina: "Stamina",
  balance: "Balance",
};
