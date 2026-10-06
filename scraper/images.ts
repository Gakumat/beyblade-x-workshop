// Downloads part/product images, keeps a PNG original (max 512px) and bakes the pixel version next to it.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getBinary } from "./http";
import { ORIG_DIR, PIXEL_DIR, pixelate } from "./pixelate";
import type { Snapshot, ScrapeSummary } from "./index";

/** Storage key for an image: parts use their slug, products are prefixed so they can't collide. */
export const imageKey = (kind: "part" | "product", slug: string) => (kind === "part" ? slug : `product-${slug}`);

export async function processImages(s: Snapshot, failed: ScrapeSummary["failed"]) {
  mkdirSync(ORIG_DIR, { recursive: true });
  mkdirSync(PIXEL_DIR, { recursive: true });
  const jobs = [
    ...s.parts.map((p) => ({ item: p, key: imageKey("part", p.slug) })),
    ...s.products.map((p) => ({ item: p, key: imageKey("product", p.slug) })),
  ];
  console.log(`Processing ${jobs.length} images…`);
  let n = 0;
  for (const { item, key } of jobs) {
    if (!item.image_url) continue;
    const orig = path.join(ORIG_DIR, `${key}.png`);
    const pix = path.join(PIXEL_DIR, `${key}.png`);
    try {
      if (!existsSync(orig)) {
        const raw = await getBinary(item.image_url);
        writeFileSync(orig, await sharp(raw).resize(512, 512, { fit: "inside", withoutEnlargement: true }).png().toBuffer());
      }
      if (!existsSync(pix)) {
        const { readFileSync } = await import("node:fs");
        writeFileSync(pix, await pixelate(readFileSync(orig)));
      }
      item.image_original = `original/${key}.png`;
      item.image_pixel = `pixel/${key}.png`;
    } catch (e) {
      failed.push({ url: item.image_url, error: `image: ${e}` });
    }
    if (++n % 50 === 0) console.log(`  ${n}/${jobs.length}`);
  }
}
