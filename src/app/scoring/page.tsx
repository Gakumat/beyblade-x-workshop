import type { Metadata } from "next";
import { scoringConfig as C } from "@/lib/scoring/config";

export const metadata: Metadata = { title: "How scoring works" };

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function ScoringPage() {
  return (
    <article className="max-w-3xl mx-auto flex flex-col gap-5 [&_h2]:font-pixel [&_h2]:text-2xl [&_h2]:mt-2">
      <h1 className="font-display text-lg sm:text-xl">HOW SCORING WORKS</h1>
      <p className="text-lg">
        Every combo gets five sub-scores from 0 to 100, an overall type, and a <b>POINTS</b> total out of {C.pointsScale}. It&apos;s a
        fun guide, not a physics simulation. All the numbers below come straight from{" "}
        <code className="font-pixel">src/lib/scoring/config.ts</code>, so this page always matches the code.
      </p>

      <h2>1. Start from the official stats</h2>
      <p>
        Takara Tomy publishes Attack, Defense and Stamina values for most parts (bits also get Dash and Burst Resistance). We scale
        each part against the best part of the same kind, so 100% means &ldquo;best in slot&rdquo;. Then the slots are mixed:
      </p>
      <ul className="px-box-flat p-3 font-pixel">
        <li>Blade {pct(C.slotWeights.blade)}</li>
        <li>Ratchet {pct(C.slotWeights.ratchet)}</li>
        <li>Bit {pct(C.slotWeights.bit)}</li>
      </ul>
      <p>
        Custom Line (CX) blades are built from pieces. The Main or Metal Blade carries {pct(C.cxPieceShare.main_blade)} of the blade
        slot and the Assist or Over Blade {pct(C.cxPieceShare.assist_blade)}. Lock Chips don&apos;t change performance.
      </p>
      <p>
        If a part has no official stats, we fall back to a rough profile for its type (for example, an Attack part counts as{" "}
        {pct(C.typeFallback.attack.attack)} attack) and lower the confidence.
      </p>

      <h2>2. Adjust for real-world factors</h2>
      <ul className="list-disc pl-6">
        <li>
          <b>Weight:</b> each gram the blade weighs above the median blade adds {C.weightPointsPerGram} to Attack and Defense (capped at
          ±{C.weightCap}). Heavier hits harder and is harder to move.
        </li>
        <li>
          <b>Low ratchet</b> (height {C.lowRatchet.maxHeight} mm or less, e.g. 3-60): +{C.lowRatchet.attack} Attack, for smash and
          upper attacks.
        </li>
        <li>
          <b>Tall ratchet</b> ({C.tallRatchet.minHeight} mm or more, e.g. 4-80): +{C.tallRatchet.stamina} Stamina,{" "}
          {C.tallRatchet.attack} Attack.
        </li>
        <li>
          <b>Bit movement:</b>{" "}
          {Object.entries(C.behaviour)
            .map(([k, v]) => `${k} (${Object.entries(v).map(([s, n]) => `${s} ${n! > 0 ? "+" : ""}${n}`).join(", ")})`)
            .join("; ")}
          . Movement comes from a hand-written table in <code className="font-pixel">data/bitProfiles.json</code>, so treat it as a
          heuristic.
        </li>
      </ul>

      <h2>3. Burst resistance and chaos</h2>
      <p>
        <b>Burst resistance</b> uses the bit&apos;s official Burst Resistance stat, mixed 80/20 with the ratchet&apos;s teeth (more
        teeth = more clicks before a burst: {C.burst.protrusionBase} + {C.burst.perProtrusion} per tooth). If the bit has no burst stat,
        only the ratchet is used, and the confidence drops.
      </p>
      <p>
        <b>Chaos</b> is for the fun, gimmicky builds: +{C.chaos.gimmickBit} for a gimmick bit, +{C.chaos.gimmickBlade} for a UX/CX
        gimmick blade, plus {C.chaos.dashPerPoint} per point of the bit&apos;s Dash stat, plus the movement bonus above.
      </p>

      <h2>4. Type and total</h2>
      <p>
        The overall type is whichever of Attack, Defense or Stamina is highest. If the top two are within {C.balanceMargin} points, it&apos;s
        a <b>Balance</b> combo.
      </p>
      <p>The POINTS total weights the sub-scores like this (then scales to {C.pointsScale}):</p>
      <table className="px-box-flat font-pixel w-full text-left">
        <thead>
          <tr>
            <th className="p-2">Sub-score</th>
            <th className="p-2">POINTS</th>
            <th className="p-2">Best attack combos</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(C.totalWeights).map((k) => (
            <tr key={k}>
              <td className="p-2 capitalize">{k}</td>
              <td className="p-2">{pct(C.totalWeights[k as keyof typeof C.totalWeights])}</td>
              <td className="p-2">{pct(C.attackWeights[k as keyof typeof C.attackWeights])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>5. Confidence</h2>
      <p>Confidence starts at 100% and drops when inputs are missing:</p>
      <ul className="list-disc pl-6">
        {Object.entries(C.confidencePenalty).map(([k, v]) => (
          <li key={k}>
            {k.replace(/([A-Z])/g, " $1").toLowerCase()}: −{v}
          </li>
        ))}
      </ul>
      <p>Anything under 70% is flagged as low confidence on the combo.</p>

      <h2>6. Matchups and battles</h2>
      <p>
        Attack beats Stamina, Stamina beats Defense, Defense beats Attack. Balance is middling against everything. In a battle, the
        win chance starts at 50%, moves ±20% for type advantage and a little more for the points difference, and is capped between 10%
        and 90%. How it wins depends on the winner&apos;s type: attackers tend to get Xtreme and Over finishes, stamina types win on Spin
        Finish, and a combo with low burst resistance is more likely to get burst. Points follow the official rules: Spin 1, Over 2,
        Burst 2, Xtreme 3.
      </p>
    </article>
  );
}
