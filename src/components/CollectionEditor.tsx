"use client";

import { useMemo, useState, useTransition } from "react";
import { addProductAction, adjustPartAction } from "@/app/actions";
import { KIND_LABEL, type Part, type Product } from "@/lib/types";

/** Admin-only: add a whole product (adds its contents) or a single part to an owner's collection. */
export function CollectionEditor({ owner, parts, products }: { owner: string; parts: Part[]; products: Product[] }) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const needle = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (needle.length < 2) return [];
    const pr = products
      .filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((p) => ({ key: `product:${p.slug}`, label: `${p.code} ${p.name}`, sub: `Product · ${p.product_type}`, product: p.slug }));
    const pa = parts
      .filter((p) => `${p.name} ${p.abbr ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((p) => ({ key: p.slug, label: p.name, sub: KIND_LABEL[p.kind], part: p.slug }));
    return [...pr, ...pa];
  }, [needle, parts, products]);

  const add = (r: (typeof results)[number]) =>
    start(async () => {
      try {
        if ("product" in r && r.product) await addProductAction(owner, r.product);
        else if ("part" in r && r.part) await adjustPartAction(owner, r.part, 1);
        setMsg(`Added ${r.label}`);
        setQ("");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e));
      }
    });

  return (
    <section className="mt-4 px-box-flat p-3">
      <label className="font-pixel block">Add a product or part to {owner}</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. Dran Sword, BX-01, Flat…"
        className="w-full font-pixel mt-1 px-2 py-1 bg-card border-2 border-foreground"
      />
      {results.length > 0 && (
        <ul className="mt-2 flex flex-col">
          {results.map((r) => (
            <li key={r.key}>
              <button
                disabled={pending}
                onClick={() => add(r)}
                className="w-full text-left px-2 py-1 hover:bg-accent hover:text-accent-foreground flex justify-between gap-2"
              >
                <span>+ {r.label}</span>
                <span className="text-sm text-muted-foreground">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-2 font-pixel text-sm">{msg}</p>}
    </section>
  );
}

export function QtyButtons({ owner, slug }: { owner: string; slug: string }) {
  const [pending, start] = useTransition();
  const btn = "font-pixel w-7 h-7 border-2 border-foreground bg-card px-press";
  return (
    <div className="flex gap-1 mt-1">
      <button aria-label="Remove one" disabled={pending} className={btn} onClick={() => start(() => adjustPartAction(owner, slug, -1))}>
        −
      </button>
      <button aria-label="Add one" disabled={pending} className={btn} onClick={() => start(() => adjustPartAction(owner, slug, 1))}>
        +
      </button>
    </div>
  );
}

