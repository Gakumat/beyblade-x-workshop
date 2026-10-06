import type { Metadata } from "next";
import { getLastScrape } from "@/lib/data";

export const metadata: Metadata = { title: "About" };
export const revalidate = 300;

export default async function AboutPage() {
  const last = await getLastScrape();
  return (
    <article className="max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="font-display text-lg sm:text-xl">ABOUT</h1>
      <p>
        Bey X Workshop is a fan-made tool for building Beyblade X combos, tracking who owns what, and helping friends pick their first
        Bey. It is not affiliated with Takara Tomy or Hasbro.
      </p>
      <h2 className="font-pixel text-2xl">Sources and credits</h2>
      <ul className="list-disc pl-6">
        <li>
          <a className="underline" href="https://beyblade.wiki" target="_blank" rel="noreferrer">
            beyblade.wiki
          </a>{" "}
          provides the parts, products, official stats, weights, descriptions and images. Its robots.txt allows crawling; we scrape
          politely (one request per second, cached) and link back to every page. Descriptions are short excerpts.
        </li>
        <li>
          The Beyblade Fandom wiki was considered as a second source, but it blocks automated requests and beyblade.wiki already had
          everything needed, so it isn&apos;t used.
        </li>
        <li>Part images are turned into pixel art automatically (background removed, downscaled, palette-reduced and dithered).</li>
        <li>Fonts: Press Start 2P, Pixelify Sans and Atkinson Hyperlegible (all SIL Open Font License, via Google Fonts).</li>
        <li>UI pieces from Pixelact UI; animation with anime.js.</li>
      </ul>
      <p className="text-muted-foreground">
        Data last refreshed: {last?.started_at ? new Date(last.started_at).toLocaleDateString("en-AU", { dateStyle: "long" }) : "never"}.
      </p>
    </article>
  );
}
