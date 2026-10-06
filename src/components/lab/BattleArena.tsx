"use client";

import { animate, createTimeline, steps, type JSAnimation, type Timeline } from "animejs";
import { useEffect, useRef, useState } from "react";
import { imgUrl } from "@/lib/images";
import { battle, type BattleResult } from "@/lib/matchup";
import type { ComboScore, ResolvedCombo } from "@/lib/scoring/score";
import { useReducedMotion } from "./motion";

const SIZE = 300;
const BEY = 60;

const FINISH_TEXT: Record<string, string> = {
  Xtreme: "XTREME FINISH!",
  Over: "OVER FINISH!",
  Burst: "BURST FINISH!",
  Spin: "SPIN FINISH!",
};

/** Two combos clash in a pixel stadium. Illustrative: the outcome is a weighted dice roll (see matchup.ts). */
export function BattleArena({
  a,
  b,
  names,
}: {
  a: { combo: ResolvedCombo; score: ComboScore };
  b: { combo: ResolvedCombo; score: ComboScore };
  names: [string, string];
}) {
  const reduced = useReducedMotion();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [result, setResult] = useState<BattleResult | null>(null);
  const [phase, setPhase] = useState<"ready" | "fight" | "done">("ready");
  const [tally, setTally] = useState<[number, number]>([0, 0]);
  const beys = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const imgs = [useRef<HTMLImageElement>(null), useRef<HTMLImageElement>(null)];
  const banner = useRef<HTMLDivElement>(null);
  const spark = useRef<HTMLDivElement>(null);
  // Cleanup for the last battle's animations. Kept until the next battle so the knock-out pose stays on screen.
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const srcs = [a, b].map((s) => imgUrl((s.combo.blade ?? s.combo.main_blade ?? s.combo.metal_blade)?.image_pixel));

  useEffect(() => {
    if (phase !== "fight") return;
    const res = battle(a.score, b.score, seed);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setResult(res);
      setPhase("done");
      setTally((t) => (res.winner === 0 ? [t[0] + res.points, t[1]] : [t[0], t[1] + res.points]));
    };
    if (reduced || !beys[0].current || !beys[1].current) {
      finish();
      return;
    }

    const spins: JSAnimation[] = imgs.map((r, i) =>
      animate(r.current!, { rotate: [0, i === 0 ? 360 : -360], duration: 300, ease: steps(8), loop: true }),
    );
    const R = SIZE / 2 - BEY / 2 - 14;
    const loser = res.winner === 0 ? 1 : 0;
    const L = beys[loser].current!;
    const side = loser === 0 ? -1 : 1;

    const tl: Timeline = createTimeline({ onComplete: finish });
    // Animation frames pause in background tabs; settle the result anyway so a battle never hangs.
    const fallback = setTimeout(finish, 4500);
    tl.add(beys[0].current!, { x: [-R, -R * 0.4], y: [R * 0.5, -R * 0.3], duration: 500, ease: "outQuad" }, 0)
      .add(beys[1].current!, { x: [R, R * 0.4], y: [-R * 0.5, R * 0.3], duration: 500, ease: "outQuad" }, 0);
    // Three clashes in the middle, sparks on each.
    for (let i = 0; i < 3; i++) {
      const at = 500 + i * 520;
      tl.add(beys[0].current!, { x: -BEY * 0.45, y: (i - 1) * 20, duration: 220, ease: "inQuad" }, at)
        .add(beys[1].current!, { x: BEY * 0.45, y: (i - 1) * 20, duration: 220, ease: "inQuad" }, at)
        .add(spark.current!, { opacity: [1, 0], scale: [0.4, 1.6], duration: 260, ease: steps(4) }, at + 220)
        .add(beys[0].current!, { x: -R * 0.6, y: (1 - i) * R * 0.4, duration: 280, ease: "outQuad" }, at + 240)
        .add(beys[1].current!, { x: R * 0.6, y: (i - 1) * R * 0.4, duration: 280, ease: "outQuad" }, at + 240);
    }
    const end = 500 + 3 * 520;
    if (res.finish === "Xtreme" || res.finish === "Over") {
      tl.add(L, { x: side * (SIZE * 0.9), y: -R * 0.2, duration: res.finish === "Xtreme" ? 350 : 650, ease: "inQuad" }, end);
    } else if (res.finish === "Burst") {
      tl.add(L, { scale: [1, 1.6], opacity: [1, 0], duration: 500, ease: steps(5) }, end);
    } else {
      tl.add(L, { rotate: 25, x: side * R * 0.3, duration: 900, ease: "outQuad", onBegin: () => spins[loser].pause() }, end);
    }
    tl.add(banner.current!, { opacity: [0, 1], scale: [2.5, 1], duration: 400, ease: steps(5) }, end + 500);

    cleanup.current = () => {
      clearTimeout(fallback);
      tl.revert();
      spins.forEach((s) => s.revert());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, seed]);

  const start = () => {
    cleanup.current?.();
    cleanup.current = null;
    setResult(null);
    setSeed(Math.floor(Math.random() * 1e9));
    setPhase("fight");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-pixel flex gap-4 text-lg">
        <span className="text-primary">{names[0]}</span>
        <span>
          {tally[0]} – {tally[1]}
        </span>
        <span className="text-secondary">{names[1]}</span>
      </div>
      <div
        className="relative overflow-hidden"
        style={{
          width: SIZE,
          height: SIZE,
          background: "var(--stage)",
          borderRadius: "50%",
          boxShadow: "0 0 0 4px var(--ring), inset 0 0 0 10px color-mix(in srgb, var(--stage) 70%, #000), inset 0 0 0 14px var(--stage-line)",
        }}
      >
        <div ref={spark} className="absolute font-display text-accent text-3xl opacity-0" style={{ left: SIZE / 2 - 18, top: SIZE / 2 - 22 }} aria-hidden>
          ✸
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            ref={beys[i]}
            className="absolute"
            style={{
              left: SIZE / 2 - BEY / 2,
              top: SIZE / 2 - BEY / 2,
              width: BEY,
              height: BEY,
              transform: phase === "ready" ? `translateX(${i === 0 ? -SIZE / 4 : SIZE / 4}px)` : undefined,
              filter: `drop-shadow(0 0 0 ${i === 0 ? "var(--primary)" : "var(--secondary)"})`,
            }}
          >
            {srcs[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgs[i]} src={srcs[i]!} alt={names[i]} className="sprite" style={{ width: BEY, height: BEY }} />
            ) : (
              <div className="w-full h-full rounded-full bg-muted" />
            )}
          </div>
        ))}
        <div
          ref={banner}
          className={`absolute inset-0 grid place-items-center text-center pointer-events-none ${phase === "done" ? "" : "opacity-0"}`}
          aria-live="polite"
        >
          {result && (
            <div className="bg-background/85 px-3 py-2 border-4 border-foreground">
              <p className="font-display text-base sm:text-lg text-accent">WINNER!</p>
              <p className="font-display text-xs mt-2">{names[result.winner]}</p>
              <p className="font-pixel mt-1">
                {FINISH_TEXT[result.finish]} +{result.points}
              </p>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={start}
        disabled={phase === "fight"}
        className="font-display text-sm px-4 py-3 bg-primary text-primary-foreground px-box-flat px-press disabled:opacity-60"
        style={{ background: "var(--primary)" }}
      >
        {phase === "ready" ? "3, 2, 1… LET IT RIP!" : phase === "fight" ? "BATTLING…" : "BATTLE AGAIN"}
      </button>
      {result && (
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {names[0]} had a {Math.round(result.chance * 100)}% chance to win this round. Illustrative only: type advantage and score tilt the dice.
        </p>
      )}
    </div>
  );
}
