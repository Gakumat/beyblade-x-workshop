/** A segmented HP-style bar. value null = unknown. */
export function StatBar({ label, value, color = "var(--primary)", segments = 10 }: { label: string; value: number | null; color?: string; segments?: number }) {
  const filled = value == null ? 0 : Math.round((value / 100) * segments);
  return (
    <div className="flex items-center gap-2 font-pixel text-sm">
      <span className="w-20 shrink-0">{label}</span>
      <div className="flex gap-[2px] flex-1" role="meter" aria-label={label} aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="h-3 flex-1 border-2 border-foreground"
            style={{ background: i < filled ? color : "transparent" }}
          />
        ))}
      </div>
      <span className="w-8 text-right tabular-nums">{value ?? "?"}</span>
    </div>
  );
}
