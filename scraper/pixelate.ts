// Pixel-art baking. Used by the scrape, and runnable on its own to re-bake from cached originals:
//   npm run pixelate                    re-bake everything
//   npm run pixelate -- --only=dran     only slugs containing "dran"
//   npm run pixelate -- --preview       also write .cache/preview.html (original vs pixel)
//   npm run pixelate -- --upload        upload re-baked sprites to Supabase Storage
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pixelConfig, type PixelConfig } from "./pixel.config";

export const IMG_DIR = path.join(".cache", "img");
export const ORIG_DIR = path.join(IMG_DIR, "original");
export const PIXEL_DIR = path.join(IMG_DIR, "pixel");

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const BAYER8 = (() => {
  // Recursive construction of the 8x8 Bayer matrix from the 4x4 one.
  const m: number[] = new Array(64);
  const b4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const b2 = [0, 2, 3, 1];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) m[y * 8 + x] = (4 * b4[(y % 4) * 4 + (x % 4)] + b2[(Math.floor(y / 4)) * 2 + Math.floor(x / 4)]) / 64 - 0.5;
  return m;
})();

/** Flood-fill from the four corners, clearing pixels close to the corner colour. Mutates RGBA. */
function removeBackground(px: Buffer, w: number, h: number, threshold: number) {
  const seen = new Uint8Array(w * h);
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  for (const start of corners) {
    if (px[start * 4 + 3] < 10) continue; // already transparent
    const r0 = px[start * 4];
    const g0 = px[start * 4 + 1];
    const b0 = px[start * 4 + 2];
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      if (seen[i]) continue;
      seen[i] = 1;
      const o = i * 4;
      const d = Math.hypot(px[o] - r0, px[o + 1] - g0, px[o + 2] - b0);
      if (px[o + 3] > 10 && d > threshold) continue;
      px[o + 3] = 0;
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
    }
  }
}

function nearest(palette: number[][], r: number, g: number, b: number) {
  let best = 0;
  let bd = Infinity;
  for (let k = 0; k < palette.length; k++) {
    const p = palette[k];
    const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return palette[best];
}

/** Turn any image buffer into a pixel-art PNG buffer. */
export async function pixelate(input: Buffer, cfg: PixelConfig = pixelConfig): Promise<Buffer> {
  // 1. Background off, trimmed.
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  removeBackground(data, info.width, info.height, cfg.bgThreshold);
  let cut = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  try {
    cut = await sharp(cut).trim({ threshold: 1 }).png().toBuffer();
  } catch {
    // Nothing to trim.
  }

  // 2. Downscale to sprite size, hard alpha edges.
  const small = await sharp(cut)
    .resize(cfg.spriteSize, cfg.spriteSize, { fit: "inside", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = small.info;
  const px = small.data;
  for (let i = 3; i < px.length; i += 4) px[i] = px[i] >= cfg.alphaCutoff ? 255 : 0;

  // 3. Quantise. Palette from libimagequant (no dither), read back as a colour list.
  const palPng = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png({ palette: true, colours: cfg.colours, dither: 0 })
    .toBuffer();
  const palRaw = await sharp(palPng).ensureAlpha().raw().toBuffer();
  const palSet = new Map<number, number[]>();
  for (let i = 0; i < palRaw.length; i += 4)
    if (palRaw[i + 3] > 0)
      palSet.set((palRaw[i] << 16) | (palRaw[i + 1] << 8) | palRaw[i + 2], [palRaw[i], palRaw[i + 1], palRaw[i + 2]]);
  const palette = [...palSet.values()];

  let out: Buffer;
  if ((cfg.dither === "bayer4" || cfg.dither === "bayer8") && palette.length) {
    const m = cfg.dither === "bayer4" ? BAYER4 : BAYER8;
    const n = cfg.dither === "bayer4" ? 4 : 8;
    out = Buffer.from(px);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (out[o + 3] === 0) continue;
        const t = m[(y % n) * n + (x % n)] * cfg.bayerSpread;
        const c = nearest(palette, out[o] + t, out[o + 1] + t, out[o + 2] + t);
        out[o] = c[0];
        out[o + 1] = c[1];
        out[o + 2] = c[2];
      }
  } else {
    const q = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
      .png({ palette: true, colours: cfg.colours, dither: cfg.dither === "none" ? 0 : cfg.diffusion })
      .toBuffer();
    out = await sharp(q).ensureAlpha().raw().toBuffer();
    for (let i = 3; i < out.length; i += 4) out[i] = out[i] >= 128 ? 255 : 0;
  }

  // Optional 1px outline on a canvas with a pixel of padding.
  let W = w;
  let H = h;
  if (cfg.outline) {
    W = w + 2;
    H = h + 2;
    const padded = Buffer.alloc(W * H * 4);
    for (let y = 0; y < h; y++) out.copy(padded, ((y + 1) * W + 1) * 4, y * w * 4, (y + 1) * w * 4);
    const solid = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < W && y < H && padded[(y * W + x) * 4 + 3] === 255;
    const edge: number[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)))
          edge.push(y * W + x);
    const [r, g, b] = cfg.outlineColour;
    for (const i of edge) padded.set([r, g, b, 255], i * 4);
    out = padded;
  }

  // 4. Nearest-neighbour upscale.
  return sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize(W * cfg.upscale, H * cfg.upscale, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Re-bake every cached original (or a filtered subset). Returns the slugs written. */
export async function bakeAll(filter?: string): Promise<string[]> {
  mkdirSync(PIXEL_DIR, { recursive: true });
  if (!existsSync(ORIG_DIR)) return [];
  const files = readdirSync(ORIG_DIR).filter((f) => f.endsWith(".png") && (!filter || f.includes(filter)));
  const done: string[] = [];
  for (const f of files) {
    try {
      writeFileSync(path.join(PIXEL_DIR, f), await pixelate(readFileSync(path.join(ORIG_DIR, f))));
      done.push(f.replace(/\.png$/, ""));
    } catch (e) {
      console.warn(`  pixelate failed for ${f}: ${e}`);
    }
  }
  return done;
}

function writePreview(slugs: string[]) {
  const cells = slugs
    .map(
      (s) =>
        `<figure><img src="img/original/${s}.png"><img class="px" src="img/pixel/${s}.png"><figcaption>${s}</figcaption></figure>`,
    )
    .join("\n");
  writeFileSync(
    path.join(".cache", "preview.html"),
    `<!doctype html><meta charset="utf-8"><title>Pixel preview</title><style>
body{background:#1b1630;color:#eee;font:12px monospace;display:flex;flex-wrap:wrap;gap:12px;padding:12px}
figure{margin:0;background:#2c2550;padding:8px;width:220px}img{width:100px;height:100px;object-fit:contain}
.px{image-rendering:pixelated}figcaption{word-break:break-all}</style>
<p style="width:100%">${JSON.stringify(pixelConfig)}</p>${cells}`,
  );
  console.log(`Preview: ${path.resolve(".cache/preview.html")}`);
}

// CLI entry point.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  const slugs = await bakeAll(only);
  console.log(`Baked ${slugs.length} sprites.`);
  if (process.argv.includes("--preview")) writePreview(slugs);
  if (process.argv.includes("--upload")) {
    const { uploadSprites } = await import("./upsert");
    await uploadSprites(slugs);
  }
}
