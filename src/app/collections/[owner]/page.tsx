import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionEditor, QtyButtons } from "@/components/CollectionEditor";
import { Sprite } from "@/components/Sprite";
import { TypeBadge } from "@/components/TypeBadge";
import { getCatalog, getOwned, getOwners } from "@/lib/data";
import { findGaps } from "@/lib/gaps";
import { isAdmin } from "@/lib/supabase/server";
import { KIND_LABEL, type PartKind } from "@/lib/types";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ owner: string }>; searchParams: Promise<{ group?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).owner)}'s collection` };
}

const GROUPS = { kind: "Part", line: "Line", type: "Type" } as const;

export default async function OwnerPage({ params, searchParams }: Props) {
  const owner = decodeURIComponent((await params).owner);
  const group = ((await searchParams).group ?? "kind") as keyof typeof GROUPS;
  const [{ parts, products, contents }, owned, owners, admin] = await Promise.all([getCatalog(), getOwned(), getOwners(), isAdmin()]);
  if (!owners.includes(owner)) notFound();

  const mine = owned.filter((o) => o.owner === owner);
  const bySlug = new Map(parts.map((p) => [p.slug, p]));
  const items = mine.map((o) => ({ ...o, part: bySlug.get(o.part_slug) })).filter((x) => x.part !== undefined);
  const ownedParts = items.map((i) => i.part!);
  const gaps = findGaps(ownedParts, parts, products, contents);

  const keyOf = (p: (typeof ownedParts)[number]) =>
    group === "line" ? (p.line ?? "Unknown line") : group === "type" ? (p.type ?? "Unknown type") : KIND_LABEL[p.kind as PartKind];
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const k = keyOf(it.part!);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }

  return (
    <div>
      <p className="font-pixel text-muted-foreground">
        <Link href="/collections" className="underline">
          Collections
        </Link>{" "}
        /
      </p>
      <h1 className="font-display text-lg sm:text-xl">★ {owner.toUpperCase()}</h1>
      <div className="flex flex-wrap gap-2 mt-3 font-pixel">
        <span className="py-1">Group by:</span>
        {Object.entries(GROUPS).map(([k, label]) => (
          <Link
            key={k}
            href={`?group=${k}`}
            className={`px-2 py-1 border-2 border-foreground ${group === k ? "bg-foreground text-background" : "bg-card"}`}
          >
            {label}
          </Link>
        ))}
        <Link href={`/lab?owner=${encodeURIComponent(owner)}`} className="px-2 py-1 border-2 border-foreground bg-primary text-primary-foreground ml-auto">
          ⚔ Best combos
        </Link>
      </div>

      {admin && <CollectionEditor owner={owner} parts={parts} products={products} />}

      {items.length === 0 && <p className="mt-6 text-muted-foreground">Nothing here yet.</p>}
      {[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([k, list]) => (
        <section key={k} className="mt-6">
          <h2 className="font-pixel text-xl capitalize">
            {k} <span className="text-muted-foreground text-base">({list.reduce((t, i) => t + i.qty, 0)})</span>
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-2">
            {list.map((it) => (
              <li key={it.part_slug} className="px-box p-2 flex flex-col items-center text-center">
                <Link href={`/parts/${it.part_slug}`} className="flex flex-col items-center">
                  <Sprite src={it.part!.image_pixel} alt={it.part!.name} size={64} />
                  <span className="font-pixel text-sm mt-1 leading-tight">
                    {it.part!.name}
                    {it.qty > 1 ? ` ×${it.qty}` : ""}
                  </span>
                </Link>
                <TypeBadge type={it.part!.type} className="mt-1" />
                {admin && <QtyButtons owner={owner} slug={it.part_slug} />}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-8 px-box-flat p-4">
        <h2 className="font-pixel text-xl">What&apos;s missing</h2>
        {gaps.length === 0 ? (
          <p className="mt-1">Nothing obvious. This collection covers every type, movement and line.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {gaps.map((g) => (
              <li key={g.label}>
                <b className="font-pixel">{g.label}.</b> {g.why}
                {g.suggestion && (
                  <>
                    {" "}
                    Try{" "}
                    <Link className="underline" href={`/products/${g.suggestion.slug}`}>
                      {g.suggestion.code} {g.suggestion.name}
                    </Link>
                    .
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
