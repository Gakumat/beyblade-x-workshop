import { Sprite } from "../Sprite";
import type { ResolvedCombo } from "@/lib/scoring/score";

/** The assembled combo as a vertical pixel stack: blade (or CX pieces) on top, ratchet, then bit. */
export function ComboStack({ combo, size = 72 }: { combo: ResolvedCombo; size?: number }) {
  const bladeParts = combo.blade
    ? [combo.blade]
    : [combo.lock_chip, combo.main_blade ?? combo.metal_blade, combo.assist_blade ?? combo.over_blade].filter((p) => !!p);
  const rows = [
    { key: "blade", parts: bladeParts, label: combo.blade ? "Blade" : "CX Blade" },
    { key: "ratchet", parts: combo.ratchet ? [combo.ratchet] : [], label: "Ratchet" },
    { key: "bit", parts: combo.bit ? [combo.bit] : [], label: "Bit" },
  ];
  return (
    <div className="flex flex-col items-center gap-1">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-1">
          {r.parts.length ? (
            r.parts.map((p) => <Sprite key={p!.slug} src={p!.image_pixel} alt={p!.name} size={r.key === "blade" ? size : size * 0.7} />)
          ) : (
            <div className="border-2 border-dashed border-muted-foreground font-pixel text-xs text-muted-foreground grid place-items-center" style={{ width: size * 0.7, height: size * 0.5 }}>
              {r.label}?
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function comboName(c: ResolvedCombo) {
  const blade = c.blade?.name ?? [c.lock_chip?.name, c.main_blade?.name ?? c.metal_blade?.name].filter(Boolean).join(" ");
  const assist = c.assist_blade?.abbr ?? c.assist_blade?.name?.[0] ?? c.over_blade?.name?.[0] ?? "";
  const ratchet = c.ratchet?.name ?? "?";
  const bit = c.bit?.abbr ?? c.bit?.name ?? "?";
  return `${blade || "?"} ${assist}${ratchet}${bit}`;
}
