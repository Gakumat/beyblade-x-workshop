"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface MenuItem {
  href: string;
  label: string;
  hint: string;
}

/** Big game-style menu: arrow keys / W-S move the cursor, Enter selects, tap works too. */
export function RetroMenu({ items }: { items: MenuItem[] }) {
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowDown" || e.key === "s") setSel((s) => (s + 1) % items.length);
      else if (e.key === "ArrowUp" || e.key === "w") setSel((s) => (s - 1 + items.length) % items.length);
      else if (e.key === "Enter" && document.activeElement === document.body) router.push(items[sel].href);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, sel, router]);

  return (
    <ul className="flex flex-col gap-3">
      {items.map((it, i) => (
        <li key={it.href}>
          <Link
            ref={(el) => {
              refs.current[i] = el;
            }}
            href={it.href}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            className={`px-box flex items-center gap-3 px-4 py-3 px-press ${i === sel ? "bg-accent! text-accent-foreground!" : ""}`}
          >
            <span className={`font-display text-sm w-4 ${i === sel ? "blink" : "opacity-0"}`} aria-hidden>
              ▶
            </span>
            <span className="flex flex-col">
              <span className="font-display text-sm sm:text-base">{it.label}</span>
              <span className="text-sm opacity-80">{it.hint}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
