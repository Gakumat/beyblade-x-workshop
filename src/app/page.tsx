import { RetroMenu } from "@/components/RetroMenu";
import { Sprite } from "@/components/Sprite";
import { getCatalog } from "@/lib/data";

export const revalidate = 300;

export default async function Home() {
  const { parts, products } = await getCatalog();
  // A few random sprites to decorate the title screen.
  const blades = parts.filter((p) => (p.kind === "blade" || p.kind === "main_blade") && p.image_pixel);
  const pick = blades.sort(() => Math.random() - 0.5).slice(0, 3);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] items-center">
      <section className="text-center md:text-left">
        <p className="font-pixel text-muted-foreground">Beyblade X · BX · UX · CX</p>
        <h1 className="font-display text-2xl sm:text-4xl leading-snug mt-2">
          BEY<span className="text-primary">X</span>
          <br />
          WORKSHOP
        </h1>
        <div className="flex justify-center md:justify-start gap-2 mt-6">
          {pick.map((p) => (
            <Sprite key={p.slug} src={p.image_pixel} alt={p.name} size={88} />
          ))}
        </div>
        <p className="mt-6 font-pixel">
          {parts.length} parts · {products.length} products
        </p>
        <p className="mt-1 text-sm text-muted-foreground font-pixel">
          PRESS <span className="blink">START</span>
        </p>
      </section>
      <RetroMenu
        items={[
          { href: "/lab", label: "COMBO LAB", hint: "Build a combo, score it, battle it" },
          { href: "/finder", label: "BEY FINDER", hint: "New to Beyblade X? Find your Bey" },
          { href: "/collections", label: "COLLECTIONS", hint: "Who owns what" },
          { href: "/parts", label: "PARTS DATABASE", hint: "Every blade, ratchet and bit" },
        ]}
      />
    </div>
  );
}
