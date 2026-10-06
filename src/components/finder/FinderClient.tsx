"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { beatCollection, productCombos } from "@/lib/matchup";
import { pitch, shortExplain } from "@/lib/pitch";
import { buildContext, type ComboScore } from "@/lib/scoring/score";
import type { BeyType, ComboParts, OwnedPart, Part, Product, ProductContent } from "@/lib/types";
import { Sprite } from "../Sprite";
import { TypeBadge } from "../TypeBadge";

type Path = "style" | "gimmick" | "bit" | "looks" | "beat";
type Rec = { product: Product; combo: ComboParts; score: ComboScore; reason: string };

const PATHS: { id: Path; title: string; blurb: string; icon: string }[] = [
  { id: "style", title: "I know how I want to play", blurb: "Hit hard, defend, outlast… pick a vibe.", icon: "⚔" },
  { id: "gimmick", title: "Show me cool gimmicks", blurb: "Beys with a special trick.", icon: "★" },
  { id: "bit", title: "Pick how it moves", blurb: "Zooming, calm, or totally wild.", icon: "↻" },
  { id: "looks", title: "I'll know it when I see it", blurb: "Browse by looks.", icon: "◉" },
  { id: "beat", title: "Beat a friend's collection", blurb: "Find a Bey that counters theirs.", icon: "☠" },
];

const STYLES: { type: BeyType; title: string; blurb: string }[] = [
  { type: "attack", title: "I just want it to hit hard", blurb: "Attack: knock the other Bey out of the stadium." },
  { type: "defense", title: "I want to be unbeatable", blurb: "Defense: a wall that attackers bounce off." },
  { type: "stamina", title: "I want it to spin forever", blurb: "Stamina: outlast everyone." },
  { type: "balance", title: "A bit of everything", blurb: "Balance: good all-rounder." },
];

const MOVES: { id: string; title: string; blurb: string }[] = [
  { id: "aggressive", title: "Zooms around", blurb: "Races round the stadium looking for a fight." },
  { id: "centre", title: "Stays calm in the middle", blurb: "Holds the centre and waits." },
  { id: "unpredictable", title: "Totally unpredictable", blurb: "Wild, weird movement. Chaos!" },
  { id: "balanced", title: "Moves, then settles", blurb: "A bit of both." },
];

export function FinderClient({
  parts,
  products,
  contents,
  owned,
  owners,
}: {
  parts: Part[];
  products: Product[];
  contents: ProductContent[];
  owned: OwnedPart[];
  owners: string[];
}) {
  const ctx = useMemo(() => buildContext(parts), [parts]);
  const bySlug = useMemo(() => new Map(parts.map((p) => [p.slug, p])), [parts]);
  const singles = useMemo(() => productCombos(products, contents, parts, ctx), [products, contents, parts, ctx]);
  const [path, setPath] = useState<Path | null>(null);
  const [recs, setRecs] = useState<{ title: string; items: Rec[] } | null>(null);

  const reset = () => {
    setPath(null);
    setRecs(null);
  };
  const show = (title: string, items: Rec[]) => {
    setRecs({ title, items });
    requestAnimationFrame(() => document.getElementById("recs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const top = (xs: typeof singles, n = 6) => [...xs].sort((a, b) => b.score.total - a.score.total).slice(0, n);

  const gimmickParts = useMemo(
    () =>
      parts
        .filter((p) => p.gimmick && (p.kind === "bit" || p.kind === "blade" || p.kind === "main_blade" || p.kind === "metal_blade"))
        .filter((p) => singles.some((s) => Object.values(s.combo).includes(p.slug))),
    [parts, singles],
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-lg sm:text-xl">BEY FINDER</h1>
      <p className="mt-2 text-lg">New to Beyblade X? Answer one question and we&apos;ll find a Bey you&apos;ll love.</p>

      {!path && (
        <ul className="grid sm:grid-cols-2 gap-3 mt-6">
          {PATHS.map((p) => (
            <li key={p.id}>
              <button onClick={() => setPath(p.id)} className="px-box w-full text-left p-4 px-press hover:bg-accent/40 h-full">
                <span className="font-display text-xl" aria-hidden>
                  {p.icon}
                </span>
                <span className="block font-pixel text-xl mt-2">{p.title}</span>
                <span className="block text-muted-foreground">{p.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {path && (
        <button onClick={reset} className="font-pixel underline mt-4">
          ◀ Start over
        </button>
      )}

      {path === "style" && (
        <Choices
          items={STYLES.map((s) => ({
            key: s.type,
            title: s.title,
            blurb: s.blurb,
            onPick: () =>
              show(
                s.title,
                top(singles.filter((x) => x.score.type === s.type)).map((x) => ({
                  ...x,
                  reason: `It's a ${s.type} type, and one of the highest-scoring ones (${x.score.total} points).`,
                })),
              ),
          }))}
        />
      )}

      {path === "bit" && (
        <Choices
          items={MOVES.map((m) => ({
            key: m.id,
            title: m.title,
            blurb: m.blurb,
            onPick: () =>
              show(
                m.title,
                top(singles.filter((x) => x.combo.bit && bySlug.get(x.combo.bit)?.behaviour === m.id)).map((x) => ({
                  ...x,
                  reason: `Its ${bySlug.get(x.combo.bit!)?.name} bit ${m.blurb.toLowerCase()}`,
                })),
              ),
          }))}
        />
      )}

      {path === "gimmick" && (
        <ul className="grid sm:grid-cols-2 gap-3 mt-4">
          {gimmickParts.map((g) => (
            <li key={g.slug}>
              <button
                className="px-box w-full text-left p-3 flex gap-3 px-press hover:bg-accent/40 h-full"
                onClick={() =>
                  show(
                    `${g.name} gimmick`,
                    top(singles.filter((s) => Object.values(s.combo).includes(g.slug))).map((x) => ({
                      ...x,
                      reason: `It comes with the ${g.name} ${g.kind === "bit" ? "bit" : "blade"}.`,
                    })),
                  )
                }
              >
                <Sprite src={g.image_pixel} alt={g.name} size={56} />
                <span>
                  <span className="font-pixel text-lg block">
                    {g.name} {g.kind === "bit" ? "Bit" : "Blade"}
                  </span>
                  <span className="text-sm">{shortExplain(g.description) ?? "A special gimmick part."}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {path === "looks" && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
          {singles
            .filter((s) => s.product.image_pixel)
            .map((s) => (
              <li key={s.product.slug}>
                <button
                  onClick={() => show(s.product.name, [{ ...s, reason: "You picked it for its looks. Good taste!" }])}
                  className="px-box-flat w-full p-2 flex flex-col items-center px-press hover:bg-accent/40"
                  aria-label={s.product.name}
                >
                  <Sprite src={s.product.image_pixel} alt={s.product.name} size={72} />
                </button>
              </li>
            ))}
        </ul>
      )}

      {path === "beat" && (
        <Choices
          items={owners.map((o) => ({
            key: o,
            title: `Beat ${o}`,
            blurb: `${owned.filter((x) => x.owner === o).length} parts in their collection`,
            onPick: () => {
              const theirs = new Set(owned.filter((x) => x.owner === o).map((x) => x.part_slug));
              const { recs: r, lean } = beatCollection(
                parts.filter((p) => theirs.has(p.slug)),
                singles,
                ctx,
                o,
              );
              show(lean ? `To beat ${o} (leans ${lean})` : `${o} has no complete combos yet`, r);
            },
          }))}
        />
      )}

      {recs && (
        <section id="recs" className="mt-8 scroll-mt-20">
          <h2 className="font-display text-sm">YOUR PICKS: {recs.title.toUpperCase()}</h2>
          {recs.items.length === 0 && <p className="mt-2 text-muted-foreground">Nothing matched. Try another option!</p>}
          <ul className="flex flex-col gap-4 mt-3">
            {recs.items.map((r) => (
              <RecCard key={r.product.slug} rec={r} bySlug={bySlug} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Choices({ items }: { items: { key: string; title: string; blurb: string; onPick: () => void }[] }) {
  return (
    <ul className="grid sm:grid-cols-2 gap-3 mt-4">
      {items.map((it) => (
        <li key={it.key}>
          <button onClick={it.onPick} className="px-box w-full text-left p-4 px-press hover:bg-accent/40 h-full">
            <span className="font-pixel text-xl block">{it.title}</span>
            <span className="text-muted-foreground">{it.blurb}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RecCard({ rec, bySlug }: { rec: Rec; bySlug: Map<string, Part> }) {
  const bit = rec.combo.bit ? bySlug.get(rec.combo.bit) : undefined;
  const blade = bySlug.get(rec.combo.blade ?? rec.combo.main_blade ?? rec.combo.metal_blade ?? "");
  return (
    <li className={`px-box p-4 flex flex-col sm:flex-row gap-4 type-${rec.score.type}`} style={{ borderLeft: "8px solid var(--type)" }}>
      <div className="flex justify-center">
        <Sprite src={rec.product.image_pixel} alt={rec.product.name} size={120} />
      </div>
      <div className="flex-1">
        <p className="font-pixel text-muted-foreground">
          {rec.product.code} · {rec.product.product_type}
        </p>
        <h3 className="font-display text-sm sm:text-base leading-snug">{rec.product.name.toUpperCase()}</h3>
        <div className="flex gap-2 items-center mt-1">
          <TypeBadge type={rec.score.type} />
          <span className="font-pixel text-sm">{rec.score.total} pts</span>
        </div>
        <p className="mt-2 text-lg">{pitch(rec.score, bit, blade)}</p>
        <p className="mt-2 text-sm">
          <b className="font-pixel">Why: </b>
          {rec.reason}
        </p>
        <div className="flex gap-3 mt-2 font-pixel">
          <Link href={`/products/${rec.product.slug}`} className="underline">
            What&apos;s in the box
          </Link>
        </div>
      </div>
    </li>
  );
}
