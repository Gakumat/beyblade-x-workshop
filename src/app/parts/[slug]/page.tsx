import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sprite } from "@/components/Sprite";
import { TypeBadge } from "@/components/TypeBadge";
import { getCatalog, getOwned } from "@/lib/data";
import { imgUrl } from "@/lib/images";
import { KIND_LABEL } from "@/lib/types";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).parts.find((x) => x.slug === slug);
  return { title: p ? `${p.name} ${KIND_LABEL[p.kind]}` : "Part" };
}

const BEHAVIOUR: Record<string, string> = {
  aggressive: "Aggressive: races around the stadium",
  centre: "Stays in the centre",
  unpredictable: "Unpredictable movement",
  balanced: "Moves, then settles",
};

export default async function PartPage({ params }: Props) {
  const { slug } = await params;
  const [{ parts, products, contents }, owned] = await Promise.all([getCatalog(), getOwned()]);
  const p = parts.find((x) => x.slug === slug);
  if (!p) notFound();

  const inProducts = contents
    .filter((c) => c.part_slug === slug)
    .map((c) => products.find((pr) => pr.slug === c.product_slug))
    .filter((x) => x !== undefined);
  const owners = owned.filter((o) => o.part_slug === slug);
  const official = Object.entries(p.official ?? {});
  const orig = imgUrl(p.image_original);
  const isBladeLike = !["ratchet", "bit", "lock_chip"].includes(p.kind);

  const rows: [string, React.ReactNode][] = [
    ["Kind", KIND_LABEL[p.kind]],
    ["Line", p.line ?? "?"],
    ["Code(s)", p.codes.join(", ") || "?"],
  ];
  if (p.abbr) rows.push(["Abbreviation", p.abbr]);
  rows.push(["Weight", p.weight_g != null ? `${p.weight_g} g` : "? (unknown)"]);
  if (isBladeLike) rows.push(["Spin", p.spin ?? "?"]);
  if (p.protrusions != null) rows.push(["Protrusions", p.protrusions]);
  if (p.height != null) rows.push(["Height", `${p.height} mm`]);
  if (p.behaviour) rows.push(["Movement", BEHAVIOUR[p.behaviour] ?? p.behaviour]);
  rows.push(["Released", p.release_date ?? "?"]);

  return (
    <article className="grid gap-6 md:grid-cols-[320px_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="px-box p-4 w-full flex justify-center">
          <Sprite src={p.image_pixel} alt={`${p.name} (pixel art)`} size={240} />
        </div>
        {orig && (
          <details className="w-full">
            <summary className="font-pixel cursor-pointer">Show original photo</summary>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={orig} alt={p.name} className="mt-2 w-full max-w-xs mx-auto" loading="lazy" />
          </details>
        )}
      </div>
      <div>
        <p className="font-pixel text-muted-foreground">{KIND_LABEL[p.kind]}</p>
        <h1 className="font-display text-lg sm:text-2xl leading-snug">{p.name.toUpperCase()}</h1>
        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <TypeBadge type={p.type} />
          {p.gimmick && <span className="font-pixel text-xs px-1.5 py-0.5 bg-accent text-accent-foreground">★ Gimmick</span>}
          {p.type_source && p.type_source !== "wiki" && (
            <span className="text-xs text-muted-foreground">
              type from {p.type_source === "stock_product" ? "its stock product" : "official stats"}
            </span>
          )}
        </div>

        <dl className="px-box-flat mt-4 p-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-pixel">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {official.length > 0 && (
          <div className="mt-4">
            <h2 className="font-pixel text-lg">Official stats</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {official.map(([k, v]) => (
                <span key={k} className="px-box-flat px-2 py-1 font-pixel">
                  {k[0].toUpperCase() + k.slice(1)} <b>{v}</b>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Takara Tomy published values, as listed on beyblade.wiki.</p>
          </div>
        )}

        {p.description && (
          <div className="mt-4">
            <h2 className="font-pixel text-lg">About</h2>
            <p className="mt-1">{p.description}</p>
            {p.source_url && (
              <a href={p.source_url} target="_blank" rel="noreferrer" className="text-sm underline text-muted-foreground">
                Read more on beyblade.wiki
              </a>
            )}
          </div>
        )}

        <div className="mt-4">
          <h2 className="font-pixel text-lg">Comes in</h2>
          {inProducts.length ? (
            <ul className="mt-1 flex flex-col gap-1">
              {inProducts.map((pr) => (
                <li key={pr.slug}>
                  <Link className="underline" href={`/products/${pr.slug}`}>
                    {pr.code} {pr.name}
                  </Link>{" "}
                  <span className="text-sm text-muted-foreground">({pr.product_type})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No products linked yet.</p>
          )}
        </div>

        <div className="mt-4">
          <h2 className="font-pixel text-lg">Owned by</h2>
          <p>{owners.length ? owners.map((o) => `${o.owner}${o.qty > 1 ? ` ×${o.qty}` : ""}`).join(", ") : "Nobody yet."}</p>
        </div>
      </div>
    </article>
  );
}
