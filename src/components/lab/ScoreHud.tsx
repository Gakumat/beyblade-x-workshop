import type { ComboScore } from "@/lib/scoring/score";
import { StatBar } from "../StatBar";
import { TypeBadge } from "../TypeBadge";

export function ScoreHud({ score, compact = false }: { score: ComboScore; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="font-pixel text-xs text-muted-foreground block">POINTS</span>
          <span className="font-display text-2xl sm:text-3xl tabular-nums">{String(score.total).padStart(3, "0")}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TypeBadge type={score.type} />
          <span className="font-pixel text-xs text-muted-foreground">
            ATK rank {score.attackTotal} · {score.confidence}% sure
          </span>
        </div>
      </div>
      <StatBar label="Attack" value={score.attack} color="var(--type-attack)" />
      <StatBar label="Defense" value={score.defense} color="var(--type-defense)" />
      <StatBar label="Stamina" value={score.stamina} color="var(--type-stamina)" />
      <StatBar label="Burst res." value={score.burst} color="var(--accent)" />
      <StatBar label="Chaos" value={score.chaos} color="var(--type-balance)" />
      {!compact && (
        <>
          <p className="mt-1">{score.summary}</p>
          {score.gimmicks.length > 0 && (
            <p className="font-pixel text-sm">
              ★ Gimmicks: <span className="text-primary">{score.gimmicks.join(", ")}</span>
            </p>
          )}
          {score.weight && <p className="font-pixel text-sm text-muted-foreground">Total weight ≈ {score.weight} g</p>}
          {score.notes.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-4">
              {score.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
