// Writes a scrape snapshot to Supabase with the service-role key. Only touches parts, products,
// product_contents, scrape_runs and the 'parts' storage bucket; owned_parts and combos are never modified.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ORIG_DIR, PIXEL_DIR } from "./pixelate";
import type { Snapshot, ScrapeSummary } from "./index";

function loadEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function client(): SupabaseClient | null {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, so skipping upload (snapshot is in .cache/out).");
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function uploadFile(sb: SupabaseClient, key: string, file: string) {
  const { error } = await sb.storage
    .from("parts")
    .upload(key, readFileSync(file), { contentType: "image/png", upsert: true, cacheControl: "604800" });
  if (error) throw new Error(`${key}: ${error.message}`);
}

export async function uploadSprites(keys: string[]) {
  const sb = client();
  if (!sb) return;
  for (const k of keys) await uploadFile(sb, `pixel/${k}.png`, path.join(PIXEL_DIR, `${k}.png`));
  console.log(`Uploaded ${keys.length} sprites.`);
}

export async function upload(s: Snapshot, summary: ScrapeSummary, startedAt: string) {
  const sb = client();
  if (!sb) return;

  // The admin allow-list for RLS writes comes from ALLOWED_EMAIL, so the email never lives in the repo.
  const admin = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (admin) await sb.from("admins").upsert({ email: admin });

  const { data: run } = await sb.from("scrape_runs").insert({ started_at: startedAt, status: "running" }).select("id").single();
  try {
    const now = new Date().toISOString();
    const parts = s.parts.map(({ image_url: _i, ...p }) => ({ ...p, updated_at: now }));
    await chunked(parts, 200, async (rows) => {
      const { error } = await sb.from("parts").upsert(rows, { onConflict: "slug" });
      if (error) throw new Error(`parts: ${error.message}`);
    });

    const partSlugs = new Set(s.parts.map((p) => p.slug));
    const products = s.products.map(({ image_url: _i, contents: _c, type: _t, ...p }) => ({
      ...p,
      type: _t,
      updated_at: now,
    }));
    await chunked(products, 200, async (rows) => {
      const { error } = await sb.from("products").upsert(rows, { onConflict: "slug" });
      if (error) throw new Error(`products: ${error.message}`);
    });

    // Contents are fully derived from the scrape, so replace them per product.
    const contents = s.products.flatMap((p) =>
      p.contents.filter((c) => partSlugs.has(c.slug)).map((c) => ({ product_slug: p.slug, part_slug: c.slug, qty: c.qty })),
    );
    await chunked(
      s.products.map((p) => p.slug),
      100,
      async (slugs) => {
        const { error } = await sb.from("product_contents").delete().in("product_slug", slugs);
        if (error) throw new Error(`product_contents delete: ${error.message}`);
      },
    );
    await chunked(contents, 500, async (rows) => {
      const { error } = await sb.from("product_contents").insert(rows);
      if (error) throw new Error(`product_contents: ${error.message}`);
    });

    // Images: upload whatever exists locally.
    let n = 0;
    for (const item of [...s.parts, ...s.products]) {
      for (const [key, dir] of [
        [item.image_original, ORIG_DIR],
        [item.image_pixel, PIXEL_DIR],
      ] as const) {
        if (!key) continue;
        const file = path.join(dir, path.basename(key));
        if (!existsSync(file)) continue;
        try {
          await uploadFile(sb, key, file);
          n++;
        } catch (e) {
          summary.failed.push({ url: key, error: `upload: ${e}` });
        }
      }
    }
    console.log(`Uploaded ${parts.length} parts, ${products.length} products, ${contents.length} content rows, ${n} images.`);
    await sb.from("scrape_runs").update({ finished_at: new Date().toISOString(), status: "ok", summary }).eq("id", run?.id);
  } catch (e) {
    await sb
      .from("scrape_runs")
      .update({ finished_at: new Date().toISOString(), status: "error", summary: { ...summary, error: String(e) } })
      .eq("id", run?.id);
    throw e;
  }
}
