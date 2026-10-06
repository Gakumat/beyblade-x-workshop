// Every tunable number in the scoring model lives here. The /scoring page renders this file, so the
// explanation always matches the code. Change a number, refresh, done.

export const scoringConfig = {
  /**
   * How much each slot contributes to the combo's Attack / Defense / Stamina. The official Takara Tomy stats
   * on each part page are normalised against the best part of the same kind first, so 1.0 = "best in slot".
   */
  slotWeights: { blade: 0.55, ratchet: 0.15, bit: 0.3 },

  /** A Custom Line (CX) blade is built from pieces. Share of the blade slot each piece carries. */
  cxPieceShare: { main_blade: 0.7, metal_blade: 0.7, assist_blade: 0.3, over_blade: 0.3, lock_chip: 0 },

  /** Used when a part has no official stats: a rough profile from its type, so the combo still scores. */
  typeFallback: {
    attack: { attack: 0.75, defense: 0.35, stamina: 0.3 },
    defense: { attack: 0.3, defense: 0.75, stamina: 0.45 },
    stamina: { attack: 0.25, defense: 0.4, stamina: 0.75 },
    balance: { attack: 0.5, defense: 0.5, stamina: 0.5 },
    unknown: { attack: 0.45, defense: 0.45, stamina: 0.45 },
  },

  /** Blade weight vs the catalogue median: each gram above adds this many points to Attack and Defense. */
  weightPointsPerGram: 1.2,
  weightCap: 10,

  /** Ratchet height (mm): lower sits the blade lower for smash/upper hits; taller helps stamina wobble less. */
  lowRatchet: { maxHeight: 6, attack: 5 },
  tallRatchet: { minHeight: 8, stamina: 4, attack: -3 },

  /** Bit movement adds flavour on top of the official numbers. */
  behaviour: {
    aggressive: { attack: 6, stamina: -4, chaos: 20 },
    unpredictable: { attack: 2, chaos: 35 },
    centre: { defense: 4, stamina: 4, chaos: 0 },
    balanced: { chaos: 10 },
  } as Record<string, Partial<Record<"attack" | "defense" | "stamina" | "chaos", number>>>,

  /** Chaos sub-score: gimmicks and dash make a combo wild and fun to watch. */
  chaos: { gimmickBit: 25, gimmickBlade: 15, dashPerPoint: 0.4 },

  /**
   * Burst resistance comes from the Bit's official "Burst Resistance" stat when present (scaled to the best
   * Bit); otherwise from ratchet protrusions (more teeth = more clicks to burst) as a weaker guess.
   */
  burst: { perProtrusion: 7, protrusionBase: 30 },

  /** A combo whose top two of Attack/Defense/Stamina are within this many points counts as Balance. */
  balanceMargin: 6,

  /** Weights for the overall POINTS total (sum to 1), then scaled to 0–999. */
  totalWeights: { attack: 0.3, defense: 0.2, stamina: 0.25, burst: 0.15, chaos: 0.1 },
  /** Used by "Best attack combos": your style, so attack and chaos count more. */
  attackWeights: { attack: 0.55, defense: 0.1, stamina: 0.1, burst: 0.1, chaos: 0.15 },
  pointsScale: 999,

  /** Confidence starts at 100; each missing input costs this much. */
  confidencePenalty: { noOfficialBlade: 30, noOfficialRatchet: 10, noOfficialBit: 20, noBladeWeight: 10, noBurst: 10 },
};

export type ScoringConfig = typeof scoringConfig;
