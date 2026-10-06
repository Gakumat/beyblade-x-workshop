import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sprite } from "@/components/Sprite";
import { TypeBadge } from "@/components/TypeBadge";
import { getCatalog } from "@/lib/data";
import { KIND_LABEL } from "@/lib/types";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).products.find((x) => x.slug === slug);
  return { title: p ? `${p.code} ${p.name}` : "Product" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { parts, products, contents } = await getCatalog();
  const p = products.find((x) => x.slug === slug);
  if (!p) notFound();
  const inside = contents
    .filter((c) => c.product_slug === slug)
    .map((c) => ({ ...c, part: parts.find((x) => x.slug === c.part_slug) }))
    .filter((c) => c.part !== undefined);

  return (
    <article className="grid gap-6 md:grid-cols-[320px_1fr]">
      <div className="px-box p-4 flex justify-center self-start">
        <Sprite src={p.image_pixel} alt={p.name} size={240} />
      </div>
      <div>
        <p className="font-pixel text-muted-foreground">
          {p.code} · {p.product_type}
        </p>
        <h1 className="font-display text-lg sm:text-2xl leading-snug">{p.name.toUpperCase()}</h1>
        <div className="flex gap-2 mt-2 items-center flex-wrap">
          <TypeBadge type={p.type} />
          {p.spin && <span className="font-pixel text-sm">{p.spin} spin</span>}
          {p.weight_g && <span className="font-pixel text-sm">~{p.weight_g} g</span>}
          {p.release_date && <span className="font-pixel text-sm text-muted-foreground">Released {p.release_date}</span>}
        </div>
        {p.description && <p className="mt-4">{p.description}</p>}
        <h2 className="font-pixel text-lg mt-4">In the box</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {inside.map((c) => (
            <li key={c.part_slug}>
              <Link href={`/parts/${c.part_slug}`} className="px-box flex flex-col items-center p-2 text-center px-press">
                <Sprite src={c.part!.image_pixel} alt={c.part!.name} size={72} />
                <span className="font-pixel text-sm mt-1">
                  {c.part!.name}
                  {c.qty > 1 ? ` ×${c.qty}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{KIND_LABEL[c.part!.kind]}</span>
              </Link>
            </li>
          ))}
          {!inside.length && <li className="text-muted-foreground">Contents unknown.</li>}
        </ul>
        {p.source_url && (
          <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm underline text-muted-foreground">
            Source: beyblade.wiki
          </a>
        )}
      </div>
    </article>
  );
}
