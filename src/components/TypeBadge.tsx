import type { BeyType } from "@/lib/types";

const ICON: Record<BeyType, string> = { attack: "⚔", defense: "⛨", stamina: "∞", balance: "☯" };

export function TypeBadge({ type, className = "" }: { type: BeyType | null; className?: string }) {
  if (!type)
    return <span className={`font-pixel text-xs px-1.5 py-0.5 bg-muted text-muted-foreground ${className}`}>Type ?</span>;
  return (
    <span
      className={`type-${type} font-pixel text-xs px-1.5 py-0.5 text-white inline-flex items-center gap-1 ${className}`}
      style={{ background: "var(--type)" }}
    >
      <span aria-hidden>{ICON[type]}</span>
      {type[0].toUpperCase() + type.slice(1)}
    </span>
  );
}
