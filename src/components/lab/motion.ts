"use client";

// Shared motion helpers for the spin and battle arenas (anime.js v4).
import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Points (as fractions of the stadium radius) tracing how a bit tends to move. */
export function movementPath(behaviour: string | null | undefined, seed = 1): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const n = 24;
  if (behaviour === "aggressive") {
    // Flower pattern: sweeps out to the edge and back, like a Flat bit hunting.
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const r = 0.62 * Math.abs(Math.cos(2.5 * t)) + 0.08;
      pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
  } else if (behaviour === "unpredictable") {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 12; i++) pts.push({ x: (rnd() - 0.5) * 1.2, y: (rnd() - 0.5) * 1.2 });
    pts.push(pts[0]);
  } else {
    const r = behaviour === "balanced" ? 0.32 : 0.06;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
  }
  return pts;
}
