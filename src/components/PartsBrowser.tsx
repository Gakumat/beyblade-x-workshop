"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Sprite } from "./Sprite";
import { TypeBadge } from "./TypeBadge";
import { KIND_LABEL, type OwnedPart, type Part, type PartKind, type Product } from "@/lib/types";

const KINDS: (PartKind | "product")[] = ["blade", "ratchet", "bit", "lock_chip", "main_blade", "assist_blade", "metal_blade", "over_blade", "product"];

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`font-pixel text-sm px-2 py-1 border-2 border-foreground px-press ${on ? "bg-foreground text-background" : "bg-card"}`}
    >
      {children}
    </button>
  );
}

export function PartsBrowser({ parts, products, owned, owners }: { parts: Part[]; products: Product[]; owned: OwnedPart[]; owners: string[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<PartKind | "product" | null>("blade");
  const [line, setLine] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);

  const ownedBy = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const o of owned) (m.get(o.part_slug) ?? m.set(o.part_slug, new Set()).get(o.part_slug)!).add(o.owner);
    return m;
  }, [owned]);

  const kinds = KINDS.filter((k) => k === "product" || parts.some((p) => p.kind === k));
  const needle = q.trim().toLowerCase();

  const items =
    kind === "product"
      ? products
          .filter((p) => !needle || `${p.name} ${p.code}`.toLowerCase().includes(needle))
          .filter((p) => !line || p.line === line)
          .filter((p) => !type || p.type === type)
          .map((p) => ({ key: p.slug, href: `/products/${p.slug}`, name: p.name, sub: `${p.code} · ${p.product_type}`, img: p.image_pixel, type: p.type }))
      : parts
          .filter((p) => !kind || p.kind === kind)
          .filter((p) => !needle || `${p.name} ${p.abbr ?? ""} ${p.codes.join(" ")}`.toLowerCase().includes(needle))
          .filter((p) => !line || p.line === line)
          .filter((p) => !type || p.type === type)
          .filter((p) => !owner || ownedBy.get(p.slug)?.has(owner))
          .map((p) => ({
            key: p.slug,
            href: `/parts/${p.slug}`,
            name: p.abbr && p.kind === "bit" ? `${p.name} (${p.abbr})` : p.name,
            sub: `${KIND_LABEL[p.kind]}${p.line ? " · " + p.line : ""}${p.weight_g ? ` · ${p.weight_g}g` : ""}`,
            img: p.image_pixel,
            type: p.type,
          }));

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, code, abbreviation…"
        className="w-full font-pixel text-lg px-3 py-2 bg-card border-4 border-foreground outline-none focus:bg-accent/30"
      />
      <div className="flex flex-wrap gap-2 mt-3">
        {kinds.map((k) => (
          <Chip key={k} on={kind === k} onClick={() => setKind(kind === k ? null : k)}>
            {k === "product" ? "Products" : KIND_LABEL[k] + "s"}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {["BX", "UX", "CX"].map((l) => (
          <Chip key={l} on={line === l} onClick={() => setLine(line === l ? null : l)}>
            {l}
          </Chip>
        ))}
        <span className="w-2" />
        {["attack", "defense", "stamina", "balance"].map((t) => (
          <Chip key={t} on={type === t} onClick={() => setType(type === t ? null : t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </Chip>
        ))}
        {kind !== "product" && owners.length > 0 && (
          <>
            <span className="w-2" />
            {owners.map((o) => (
              <Chip key={o} on={owner === o} onClick={() => setOwner(owner === o ? null : o)}>
                ★ {o}
              </Chip>
            ))}
          </>
        )}
      </div>
      <p className="font-pixel text-sm text-muted-foreground mt-3">{items.length} found</p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-2">
        {items.map((it) => (
          <li key={it.key}>
            <Link href={it.href} className="px-box flex flex-col items-center text-center p-3 h-full px-press hover:bg-accent/40">
              <Sprite src={it.img} alt={it.name} size={96} />
              <span className="font-pixel mt-2 leading-tight">{it.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{it.sub}</span>
              <TypeBadge type={it.type} className="mt-2" />
              {ownedBy.get(it.key)?.size ? <span className="text-xs mt-1">★ {[...ownedBy.get(it.key)!].join(", ")}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
