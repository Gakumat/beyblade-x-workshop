"use client";

import { animate, steps, type JSAnimation } from "animejs";
import { useEffect, useRef } from "react";
import { imgUrl } from "@/lib/images";
import type { ComboScore, ResolvedCombo } from "@/lib/scoring/score";
import { movementPath, useReducedMotion } from "./motion";

const SIZE = 260;
const BEY = 64;

/** The combo's blade spinning in a pixel stadium, moving the way its bit tends to move. */
export function SpinArena({ combo, score }: { combo: ResolvedCombo; score: ComboScore | null }) {
  const reduced = useReducedMotion();
  const mover = useRef<HTMLDivElement>(null);
  const spinners = useRef<(HTMLImageElement | null)[]>([]);
  const blade = combo.blade ?? combo.main_blade ?? combo.metal_blade;
  const src = imgUrl(blade?.image_pixel);
  const behaviour = combo.bit?.behaviour;
  const dir = blade?.spin === "left" ? -1 : 1;

  useEffect(() => {
    if (reduced || !mover.current || !src) return;
    const anims: JSAnimation[] = [];
    // Frame-stepped rotation reads as sprite animation rather than smooth CSS.
    spinners.current.forEach((el, i) => {
      if (!el) return;
      anims.push(animate(el, { rotate: [0, 360 * dir], duration: 360, ease: steps(8), loop: true, delay: i * 40 }));
    });
    const R = (SIZE - BEY) / 2;
    const pts = movementPath(behaviour, (blade?.name.length ?? 3) + (combo.bit?.name.length ?? 0));
    const speed = behaviour === "aggressive" ? 140 : behaviour === "unpredictable" ? 220 : 260;
    anims.push(
      animate(mover.current, {
        keyframes: pts.map((p) => ({ x: p.x * R, y: p.y * R, duration: speed })),
        ease: "linear",
        loop: true,
      }),
    );
    return () => anims.forEach((a) => a.revert());
  }, [reduced, src, dir, behaviour, blade?.name, combo.bit?.name]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden"
        style={{
          width: SIZE,
          height: SIZE,
          background: "var(--stage)",
          borderRadius: "50%",
          boxShadow: "0 0 0 4px var(--ring), inset 0 0 0 10px color-mix(in srgb, var(--stage) 70%, #000), inset 0 0 0 14px var(--stage-line)",
        }}
        aria-label={blade ? `${blade.name} spinning` : "Empty stadium"}
      >
        <div className="absolute inset-[30%] rounded-full border-2 border-dashed opacity-40" style={{ borderColor: "var(--stage-line)" }} />
        {src ? (
          <div ref={mover} className="absolute" style={{ left: SIZE / 2 - BEY / 2, top: SIZE / 2 - BEY / 2, width: BEY, height: BEY }}>
            {/* Ghost copies lag behind the main sprite to make a motion trail. */}
            {[2, 1, 0].map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={g}
                ref={(el) => {
                  spinners.current[g] = el;
                }}
                src={src}
                alt=""
                className="sprite absolute inset-0"
                style={{ width: BEY, height: BEY, opacity: g === 0 ? 1 : 0.25 / g }}
              />
            ))}
          </div>
        ) : (
          <p className="absolute inset-0 grid place-items-center font-pixel text-muted-foreground">Pick a blade</p>
        )}
      </div>
      <p className="font-pixel text-sm mt-2 text-muted-foreground">
        {reduced && src ? "SPINNING (motion reduced)" : behaviour ? `Movement: ${behaviour}` : " "}
        {score && ` · ${blade?.spin ?? "right"} spin`}
      </p>
    </div>
  );
}
