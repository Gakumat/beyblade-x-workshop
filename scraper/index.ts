// npm run scrape [-- --fresh] [-- --no-images] [-- --no-upload]
// Scrapes beyblade.wiki → normalises → applies curated data → diffs against the last run → images → Supabase.
// Safe to re-run: it upserts parts/products by slug and never touches owned_parts or combos.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getHtml, robotsAllows } from "./http";
import {
  ORIGIN,
  PART_LISTS,
  PRODUCT_LIST,
  kindFromSlug,
  parsePartList,
  parsePartPage,
  parseProductList,
  parseComboName,
  parseProductPage,
  slugFromUrl,
} from "./sources/beybladeWiki";
import { enrich } from "./normalise";
import { processImages } from "./images";
import { upload } from "./upsert";
import type { ScrapedPart, ScrapedProduct } from "./types";

const OUT_DIR = path.join(".cache", "out");
const SNAPSHOT = path.join(OUT_DIR, "db.json");
const args = new Set(process.argv.slice(2));
const fresh = args.has("--fresh");

export interface Snapshot {
  scrapedAt: string;
  parts: ScrapedPart[];
  products: ScrapedProduct[];
}

export interface ScrapeSummary {
  noPage: string[];
  parts: number;
  products: number;
  newParts: string[];
  changedParts: string[];
  newProducts: string[];
  changedProducts: string[];
  failed: { url: string; error: string }[];
  skippedSources: string[];
}

function diff<T extends { slug: string }>(prev: T[], next: T[]) {
  const before = new Map(prev.map((p) => [p.slug, JSON.stringify(p)]));
  const added: string[] = [];
  const changed: string[] = [];
  for (const p of next) {
    const old = before.get(p.slug);
    if (!old) added.push(p.slug);
    else if (old !== JSON.stringify(p)) changed.push(p.slug);
  }
  return { added, changed };
}

async function main() {
  const startedAt = new Date().toISOString();
  const failed: ScrapeSummary["failed"] = [];
  const skippedSources: string[] = [];

  if (!(await robotsAllows(ORIGIN, "/"))) {
    console.error("beyblade.wiki robots.txt disallows scraping. Stopping.");
    process.exit(1);
  }
  // The Beyblade Fandom wiki was planned as a secondary source, but beyblade.wiki already provides per-part
  // weights and official stats, and Fandom blocks automated requests (403 on robots.txt). Not used.
  skippedSources.push("beyblade.fandom.com (not needed; blocks automated requests)");

  // 1. Part lists → part pages
  const rows = new Map<string, ReturnType<typeof parsePartList>[number]>();
  for (const list of PART_LISTS) {
    try {
      for (const row of parsePartList(await getHtml(list.url, { fresh }), list.kind)) {
        const slug = slugFromUrl(row.url)!;
        if (!rows.has(slug)) rows.set(slug, row);
      }
    } catch (e) {
      failed.push({ url: list.url, error: String(e) });
    }
  }
  console.log(`Found ${rows.size} parts in the lists. Fetching part pages…`);

  const parts = new Map<string, ScrapedPart>();
  let i = 0;
  for (const [slug, row] of rows) {
    i++;
    try {
      const html = await getHtml(row.url, { fresh });
      parts.set(slug, parsePartPage(html, row.url, row));
    } catch (e) {
      failed.push({ url: row.url, error: String(e) });
    }
    if (i % 25 === 0) console.log(`  ${i}/${rows.size}`);
  }

  // 2. Product list → product pages. Two passes: the first finds parts that only appear on product pages
  // (e.g. CX metal/over blades without a list page), the second matches contents once those parts are known.
  const productRows = parseProductList(await getHtml(PRODUCT_LIST, { fresh }));
  console.log(`Found ${productRows.length} products. Fetching product pages…`);
  const noPage: string[] = [];
  const productHtml = new Map<string, { html: string; row: (typeof productRows)[number] }>();
  for (const row of productRows) {
    if (!row.url) {
      // Launchers, grips, stadiums and some variants have no wiki page. Not an error.
      noPage.push(`${row.code} ${row.name}`);
      continue;
    }
    const slug = slugFromUrl(row.url);
    if (!slug || productHtml.has(slug)) continue;
    try {
      productHtml.set(slug, { html: await getHtml(row.url, { fresh }), row });
    } catch (e) {
      failed.push({ url: row.url, error: String(e) });
    }
  }

  const extraPartUrls = new Set<string>();
  for (const { html, row } of productHtml.values()) {
    for (const slug of parseProductPage(html, row.url!, row, parts).linked_parts)
      if (!parts.has(slug)) extraPartUrls.add(`${ORIGIN}/${slug}/`);
    // Some ratchets/blades aren't on the list pages or linked; guess their page from the combo name.
    const combo = parseComboName(row.name);
    if (combo) {
      for (const guess of [`${combo.ratchet.toLowerCase()}-ratchet`, `${combo.blade.toLowerCase().replace(/\s+/g, "-")}-blade`])
        if (!parts.has(guess)) extraPartUrls.add(`${ORIGIN}/${guess}/`);
    }
  }
  if (extraPartUrls.size) console.log(`Fetching ${extraPartUrls.size} parts only linked from product pages…`);
  for (const url of extraPartUrls) {
    const slug = slugFromUrl(url)!;
    try {
      const html = await getHtml(url, { fresh });
      parts.set(slug, parsePartPage(html, url, { kind: kindFromSlug(slug)!, name: "", abbr: null, code: null }));
    } catch (e) {
      // Guessed URLs that don't exist are expected; only report real links.
      if (!/\b404\b/.test(String(e))) failed.push({ url, error: String(e) });
    }
  }

  // 3. Second pass with the full part index; sets inherit the contents of products they link to.
  const products = new Map<string, ScrapedProduct>();
  const links = new Map<string, string[]>();
  for (const { html, row } of productHtml.values()) {
    const { linked_products, linked_parts: _lp, ...product } = parseProductPage(html, row.url!, row, parts);
    products.set(product.slug, product);
    links.set(product.slug, linked_products);
  }
  for (const p of products.values()) {
    const combo = parseComboName(p.name);
    if (combo && p.contents.length && p.contents.length < 3)
      failed.push({ url: p.source_url, error: `Partial contents for ${p.code} ${p.name}: some parts have no wiki page` });
    if (p.contents.length) continue;
    const qty = new Map<string, number>();
    for (const linked of links.get(p.slug) ?? []) {
      const other = products.get(linked);
      if (!other || other.slug === p.slug) continue;
      for (const c of other.contents) qty.set(c.slug, (qty.get(c.slug) ?? 0) + c.qty);
    }
    if (qty.size) p.contents = [...qty].map(([slug, n]) => ({ slug, qty: n }));
    else if (/\d+-\d+/.test(p.name)) failed.push({ url: p.source_url, error: `Couldn't work out the contents of ${p.code} ${p.name}` });
  }

  // 4. Fill derived fields (blade types from stock products, bit behaviour, overrides)
  const snapshot: Snapshot = enrich({ scrapedAt: startedAt, parts: [...parts.values()], products: [...products.values()] });

  // 5. Diff against the last run
  mkdirSync(OUT_DIR, { recursive: true });
  const prev: Snapshot | null = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
  const strip = <T extends object>(xs: T[]) => xs.map((x) => ({ ...x, image_original: undefined, image_pixel: undefined }));
  const pd = diff(strip(prev?.parts ?? []) as ScrapedPart[], strip(snapshot.parts) as ScrapedPart[]);
  const prd = diff(strip(prev?.products ?? []) as ScrapedProduct[], strip(snapshot.products) as ScrapedProduct[]);
  const summary: ScrapeSummary = {
    parts: snapshot.parts.length,
    products: snapshot.products.length,
    newParts: pd.added,
    changedParts: pd.changed,
    newProducts: prd.added,
    changedProducts: prd.changed,
    failed,
    skippedSources,
    noPage,
  };
  // 6. Images (download originals + bake pixel art)
  if (!args.has("--no-images")) await processImages(snapshot, failed);
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 1));

  // 7. Upload
  if (!args.has("--no-upload")) await upload(snapshot, summary, startedAt);

  console.log("\n=== Scrape summary ===");
  console.log(`Parts: ${summary.parts} (${pd.added.length} new, ${pd.changed.length} changed)`);
  console.log(`Products: ${summary.products} (${prd.added.length} new, ${prd.changed.length} changed)`);
  if (noPage.length) console.log(`No wiki page (skipped): ${noPage.length}, e.g. ${noPage.slice(0, 3).join('; ')}`);
  console.log(`Failed: ${failed.length}`);
  for (const f of failed.slice(0, 30)) console.log(`  ✗ ${f.url}  ${f.error}`);
  for (const s of skippedSources) console.log(`  skipped source: ${s}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
