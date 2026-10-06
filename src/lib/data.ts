import "server-only";

// Data access. Reads Supabase when configured; otherwise (local dev before Supabase exists) reads the
// scraper snapshot in .cache/out/db.json and keeps collections/combos in .cache/local-db.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { createClient, createPublicClient, hasSupabase } from "./supabase/server";
import type { ComboParts, OwnedPart, Part, Product, ProductContent, SavedCombo } from "./types";

export interface Catalog {
  parts: Part[];
  products: Product[];
  contents: ProductContent[];
}

const SNAPSHOT = path.join(process.cwd(), ".cache", "out", "db.json");
const LOCAL_DB = path.join(process.cwd(), ".cache", "local-db.json");

type LocalDb = { owners: string[]; owned: OwnedPart[]; combos: SavedCombo[] };
function readLocal(): LocalDb {
  if (!existsSync(LOCAL_DB)) return { owners: ["Andrew"], owned: [], combos: [] };
  return JSON.parse(readFileSync(LOCAL_DB, "utf8"));
}
function writeLocal(db: LocalDb) {
  mkdirSync(path.dirname(LOCAL_DB), { recursive: true });
  writeFileSync(LOCAL_DB, JSON.stringify(db, null, 1));
}

function snapshotCatalog(): Catalog {
  if (!existsSync(SNAPSHOT)) return { parts: [], products: [], contents: [] };
  const s = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const parts: Part[] = s.parts.map((p: Part & { image_url?: string }) => ({
    ...p,
    contact_points: p.contact_points ?? null,
    image_original: p.image_original ?? null,
    image_pixel: p.image_pixel ?? null,
  }));
  const products: Product[] = s.products.map((p: Product & { contents: { slug: string; qty: number }[] }) => ({
    ...p,
    image_original: p.image_original ?? null,
    image_pixel: p.image_pixel ?? null,
  }));
  const slugs = new Set(parts.map((p) => p.slug));
  const contents: ProductContent[] = s.products.flatMap((p: { slug: string; contents: { slug: string; qty: number }[] }) =>
    p.contents.filter((c) => slugs.has(c.slug)).map((c) => ({ product_slug: p.slug, part_slug: c.slug, qty: c.qty })),
  );
  return { parts, products, contents };
}

const fetchCatalog = unstable_cache(
  async (): Promise<Catalog> => {
    const sb = createPublicClient();
    const [parts, products, contents] = await Promise.all([
      sb.from("parts").select("*").order("name"),
      sb.from("products").select("*").order("code"),
      sb.from("product_contents").select("*").limit(5000),
    ]);
    if (parts.error) throw parts.error;
    if (products.error) throw products.error;
    if (contents.error) throw contents.error;
    return {
      parts: parts.data as Part[],
      products: products.data as Product[],
      contents: contents.data as ProductContent[],
    };
  },
  ["catalog"],
  { revalidate: 300, tags: ["catalog"] },
);

/** All parts, products and product contents (a few hundred rows: small enough to hold in memory). */
export async function getCatalog(): Promise<Catalog> {
  return hasSupabase() ? fetchCatalog() : snapshotCatalog();
}

export async function getOwners(): Promise<string[]> {
  if (!hasSupabase()) return readLocal().owners;
  const { data, error } = await createPublicClient().from("owner_tags").select("name").order("name");
  if (error) throw error;
  return data.map((r) => r.name);
}

export async function getOwned(): Promise<OwnedPart[]> {
  if (!hasSupabase()) return readLocal().owned;
  const { data, error } = await createPublicClient().from("owned_parts").select("part_slug, owner, qty").limit(5000);
  if (error) throw error;
  return data as OwnedPart[];
}

const COMBO_COLS = ["blade", "lock_chip", "main_blade", "assist_blade", "metal_blade", "over_blade", "ratchet", "bit"] as const;

export async function getCombos(): Promise<SavedCombo[]> {
  if (!hasSupabase()) return readLocal().combos;
  const { data, error } = await createPublicClient().from("combos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    owner: r.owner,
    created_at: r.created_at,
    parts: Object.fromEntries(COMBO_COLS.map((c) => [c, r[`${c}_slug`] ?? null])) as ComboParts,
  }));
}

export async function getLastScrape() {
  if (!hasSupabase()) {
    return existsSync(SNAPSHOT)
      ? { started_at: JSON.parse(readFileSync(SNAPSHOT, "utf8")).scrapedAt, status: "local snapshot", summary: {} }
      : null;
  }
  const { data } = await createPublicClient()
    .from("scrape_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { started_at: string; finished_at?: string; status: string; summary: Record<string, unknown> } | null;
}

// ---------- writes (callers must check isAdmin first) ----------

export async function addOwner(name: string) {
  if (!hasSupabase()) {
    const db = readLocal();
    if (!db.owners.includes(name)) db.owners.push(name);
    return writeLocal(db);
  }
  const { error } = await (await createClient()).from("owner_tags").upsert({ name });
  if (error) throw error;
}

export async function renameOwner(from: string, to: string) {
  if (!hasSupabase()) {
    const db = readLocal();
    db.owners = db.owners.map((o) => (o === from ? to : o));
    db.owned.forEach((o) => o.owner === from && (o.owner = to));
    db.combos.forEach((c) => c.owner === from && (c.owner = to));
    return writeLocal(db);
  }
  const { error } = await (await createClient()).from("owner_tags").update({ name: to }).eq("name", from);
  if (error) throw error;
}

export async function deleteOwner(name: string) {
  if (!hasSupabase()) {
    const db = readLocal();
    db.owners = db.owners.filter((o) => o !== name);
    db.owned = db.owned.filter((o) => o.owner !== name);
    return writeLocal(db);
  }
  const { error } = await (await createClient()).from("owner_tags").delete().eq("name", name);
  if (error) throw error;
}

/** Add (delta > 0) or remove (delta < 0) copies of parts for an owner. */
export async function adjustOwned(owner: string, changes: { part_slug: string; delta: number }[]) {
  const current = (await getOwned()).filter((o) => o.owner === owner);
  const next = new Map(current.map((o) => [o.part_slug, o.qty]));
  for (const c of changes) next.set(c.part_slug, Math.max(0, (next.get(c.part_slug) ?? 0) + c.delta));
  const upserts = [...next].filter(([, q]) => q > 0).map(([part_slug, qty]) => ({ part_slug, owner, qty }));
  const removals = [...next].filter(([, q]) => q === 0).map(([s]) => s);

  if (!hasSupabase()) {
    const db = readLocal();
    db.owned = [...db.owned.filter((o) => o.owner !== owner), ...upserts];
    return writeLocal(db);
  }
  const sb = await createClient();
  const touched = new Set(changes.map((c) => c.part_slug));
  const rows = upserts.filter((u) => touched.has(u.part_slug));
  if (rows.length) {
    const { error } = await sb.from("owned_parts").upsert(rows, { onConflict: "part_slug,owner" });
    if (error) throw error;
  }
  if (removals.length) {
    const { error } = await sb.from("owned_parts").delete().eq("owner", owner).in("part_slug", removals);
    if (error) throw error;
  }
}

export async function saveCombo(c: { name: string; owner: string | null; parts: ComboParts; scores: unknown }) {
  if (!hasSupabase()) {
    const db = readLocal();
    db.combos.unshift({ id: crypto.randomUUID(), name: c.name, owner: c.owner, parts: c.parts, created_at: new Date().toISOString() });
    return writeLocal(db);
  }
  const row: Record<string, unknown> = { name: c.name, owner: c.owner, scores: c.scores };
  for (const col of COMBO_COLS) row[`${col}_slug`] = c.parts[col] ?? null;
  const { error } = await (await createClient()).from("combos").insert(row);
  if (error) throw error;
}

export async function deleteCombo(id: string) {
  if (!hasSupabase()) {
    const db = readLocal();
    db.combos = db.combos.filter((c) => c.id !== id);
    return writeLocal(db);
  }
  const { error } = await (await createClient()).from("combos").delete().eq("id", id);
  if (error) throw error;
}
