// Parser for beyblade.wiki (WordPress). robots.txt allows all crawlers; we credit the site in the app.
import * as cheerio from "cheerio";
import type { BeyType, Line, OfficialStats, PartKind, ScrapedPart, ScrapedProduct } from "../types";

export const ORIGIN = "https://beyblade.wiki";

export const PART_LISTS: { url: string; kind: PartKind }[] = [
  { url: `${ORIGIN}/list-of-beyblade-x-blades/`, kind: "blade" },
  { url: `${ORIGIN}/list-of-beyblade-x-ratchets/`, kind: "ratchet" },
  { url: `${ORIGIN}/list-of-beyblade-x-bits/`, kind: "bit" },
  { url: `${ORIGIN}/beyblade-x-lock-chips/`, kind: "lock_chip" },
  { url: `${ORIGIN}/list-of-beyblade-x-main-blades/`, kind: "main_blade" },
  { url: `${ORIGIN}/list-of-beyblade-x-assist-blades/`, kind: "assist_blade" },
];
export const PRODUCT_LIST = `${ORIGIN}/beyblade-x-list/`;

// Banner/logo images that appear on every page and are never the part itself.
const BORING_IMG = /Beyblade-X-1024|Beyblade_X_Logo|Beyblade-X\.webp|logo/i;

/** Part kind from a wiki slug suffix. Order matters: the specific suffixes come before "-blade". */
export function kindFromSlug(slug: string): PartKind | null {
  const s = slug.replace(/\/$/, "");
  if (s.endsWith("-lock-chip")) return "lock_chip";
  if (s.endsWith("-main-blade")) return "main_blade";
  if (s.endsWith("-assist-blade")) return "assist_blade";
  if (s.endsWith("-metal-blade")) return "metal_blade";
  if (s.endsWith("-over-blade")) return "over_blade";
  if (s.endsWith("-ratchet")) return "ratchet";
  if (s.endsWith("-bit")) return "bit";
  if (s.endsWith("-blade")) return "blade";
  return null;
}

export function slugFromUrl(url: string): string | null {
  const m = url.match(/^https?:\/\/beyblade\.wiki\/([^/#?]+)\/?/);
  return m ? m[1].toLowerCase() : null;
}

/** "phoenix-feather-blade" → "Phoenix Feather" */
export function nameFromSlug(slug: string): string {
  return slug
    .replace(/-(lock-chip|main-blade|assist-blade|metal-blade|over-blade|ratchet|bit|blade)$/, "")
    .split("-")
    .map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export function lineFromCode(code: string | null | undefined): Line | null {
  const m = (code ?? "").toUpperCase().match(/^(BX|UX|CX)/);
  return m ? (m[1] as Line) : null;
}

function toType(v: string | undefined): BeyType | null {
  const t = (v ?? "").toLowerCase();
  if (t.includes("attack")) return "attack";
  if (t.includes("defen")) return "defense";
  if (t.includes("stamina")) return "stamina";
  if (t.includes("balance")) return "balance";
  return null;
}

/** "Approx. 45,80 g" → 45.8 */
function toNumber(v: string | undefined): number | null {
  const m = (v ?? "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

const cleanAbbr = (a: string) => (!a || /^[A-Z]{2,3}-\d+/.test(a) ? null : a);
const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

/** Reads the "KEY : value<br>KEY : value" spec paragraph at the top of each page. */
export function parseSpec($: cheerio.CheerioAPI): Record<string, string> {
  const spec: Record<string, string> = {};
  const p = $(".entry-content p")
    .filter((_, el) => /PRODUCT CODE/i.test($(el).text()))
    .first();
  const html = p.html() ?? "";
  for (const chunk of html.split(/<br\s*\/?>/i)) {
    const text = clean(cheerio.load(`<x>${chunk}</x>`)("x").text());
    const m = text.match(/^([A-Z .()]+?)\s*:\s*(.+)$/i);
    if (m) spec[m[1].replace(/\./g, "").trim().toUpperCase()] = m[2].trim();
  }
  return spec;
}

/** The "<Name> Stats (Official)" table: header row of labels, one row of numbers. */
export function parseOfficialStats($: cheerio.CheerioAPI): OfficialStats {
  const h = $(".entry-content h2, .entry-content h3")
    .filter((_, el) => /Stats\s*\(Official\)/i.test($(el).text()))
    .first();
  if (!h.length) return {};
  const table = h.nextAll("figure").first().find("table");
  const labels = table.find("th").map((_, e) => clean($(e).text()).toLowerCase()).get();
  const values = table.find("tbody td").map((_, e) => toNumber($(e).text())).get();
  const out: OfficialStats = {};
  labels.forEach((label, i) => {
    const v = values[i];
    if (v == null) return;
    if (label.startsWith("attack")) out.attack = v;
    else if (label.startsWith("defen")) out.defense = v;
    else if (label.startsWith("stamina")) out.stamina = v;
    else if (label.startsWith("dash")) out.dash = v;
    else if (label.startsWith("burst")) out.burst = v;
    else if (label.startsWith("height")) out.height = v;
  });
  return out;
}

/** First paragraphs under "Description of …", trimmed to a short excerpt (we link to the full page). */
export function parseDescription($: cheerio.CheerioAPI, maxChars = 420): string | null {
  const h = $(".entry-content h2")
    .filter((_, el) => /^Description/i.test(clean($(el).text())))
    .first();
  if (!h.length) return null;
  const paras = h
    .nextAll("p")
    .slice(0, 2)
    .map((_, e) => clean($(e).text()))
    .get()
    .filter(Boolean)
    .join(" ");
  if (!paras) return null;
  if (paras.length <= maxChars) return paras;
  const cut = paras.slice(0, maxChars);
  const lastStop = cut.lastIndexOf(". ");
  return (lastStop > 120 ? cut.slice(0, lastStop + 1) : cut + "…").trim();
}

/** The part/product picture sits inside the cover block next to the spec; fall back to the first real image. */
export function parseMainImage($: cheerio.CheerioAPI): string | null {
  const pick = (sel: string) =>
    $(sel)
      .map((_, e) => $(e).attr("src"))
      .get()
      .find((src) => src && !BORING_IMG.test(src));
  return pick(".wp-block-cover__inner-container img") ?? pick(".entry-content img") ?? null;
}

function spinFrom(text: string): "right" | "left" | "dual" | null {
  const t = text.toLowerCase();
  if (/dual[- ]spin|both spin directions/.test(t)) return "dual";
  if (/left[- ]spin/.test(t)) return "left";
  if (/right[- ]spin/.test(t)) return "right";
  return null;
}

/** Rows of a parts list table: [first product code, part name + link, abbreviation?]. */
export function parsePartList(html: string, kind: PartKind) {
  const $ = cheerio.load(html);
  const rows: { url: string; name: string; abbr: string | null; code: string | null; kind: PartKind }[] = [];
  $(".entry-content table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((_, e) => clean($(e).text()).toLowerCase())
      .get();
    const abbrCol = headers.findIndex((h) => h.startsWith("abbreviation"));
    $(table)
      .find("tr")
      .slice(1)
      .each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 2) return;
        // The part link is the first cell link that points at a part page (column 0 is the product code,
        // which sometimes links to the part too, so it's only a fallback).
        let url: string | null = null;
        let name = "";
        const cells = [...tds.toArray().slice(1), tds[0]];
        for (const td of cells) {
          const href = $(td).find("a").attr("href");
          const slug = href ? slugFromUrl(href) : null;
          if (slug && kindFromSlug(slug)) {
            url = href!;
            name = clean($(td).text());
            break;
          }
        }
        if (!url) return;
        if (!name || /^[A-Z]{2,3}-\d+/.test(name)) name = nameFromSlug(slugFromUrl(url)!);
        rows.push({
          url,
          name,
          abbr: abbrCol >= 0 ? cleanAbbr(clean($(tds[abbrCol]).text())) : null,
          code: clean($(tds[0]).text()) || null,
          kind,
        });
      });
  });
  return rows;
}

/** Parse an individual part page. */
export function parsePartPage(
  html: string,
  url: string,
  hint: { kind: PartKind; name: string; abbr: string | null; code: string | null },
): ScrapedPart {
  const $ = cheerio.load(html);
  const spec = parseSpec($);
  const official = parseOfficialStats($);
  const description = parseDescription($);
  const slug = slugFromUrl(url)!;
  const kind = kindFromSlug(slug) ?? hint.kind;
  const code = spec["PRODUCT CODE"] ?? hint.code;
  const name = hint.name || nameFromSlug(slug);

  // Ratchets encode protrusions and height in the name: "4-80" → 4 protrusions, 8.0 mm.
  let protrusions: number | null = null;
  let height: number | null = null;
  if (kind === "ratchet") {
    const m = name.match(/^(\d+)-(\d+)/);
    if (m) {
      protrusions = Number(m[1]);
      height = Number(m[2]) / 10;
    }
  } else if (kind === "bit" && spec["HEIGHT"]) {
    height = toNumber(spec["HEIGHT"]);
  }

  return {
    slug,
    kind,
    name,
    abbr: hint.abbr ?? spec["ABBR"] ?? null,
    line: lineFromCode(code),
    codes: code ? [code.toUpperCase().replace(/\s+/g, "")] : [],
    type: toType(spec["TYPE"]),
    type_source: spec["TYPE"] ? "wiki" : null,
    weight_g: toNumber(spec["WEIGHT"]),
    spin: kind === "ratchet" || kind === "bit" ? null : spinFrom(description ?? $(".entry-content").text()),
    protrusions,
    height,
    official,
    behaviour: null,
    gimmick: false,
    description,
    release_date: spec["RELEASE DATE"] ?? null,
    image_url: parseMainImage($),
    source_url: url,
  };
}

/** Rows of the product list: code, name (+ link), release date, "(Starter)" style notes. */
export function parseProductList(html: string) {
  const $ = cheerio.load(html);
  const rows: { code: string; name: string; url: string | null; release: string | null; note: string | null; section: string }[] =
    [];
  $(".entry-content table").each((_, table) => {
    const section = clean($(table).prevAll("h2,h3").first().text());
    $(table)
      .find("tr")
      .slice(1)
      .each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 2) return;
        const code = clean($(tds[0]).text()).toUpperCase();
        const a = $(tds[1]).find("a").first();
        const full = clean($(tds[1]).text());
        const name = clean(a.text()) || full;
        const note = full.match(/\(([^)]+)\)\s*$/)?.[1] ?? null;
        rows.push({
          code,
          name,
          url: a.attr("href") ?? null,
          release: tds.length > 2 ? clean($(tds[2]).text()) || null : null,
          note,
          section,
        });
      });
  });
  return rows;
}

/** Product kind from the name, then from the description ("It is a Starter…"). */
function productType(name: string, text: string): ScrapedProduct["product_type"] {
  const n = name.toLowerCase();
  if (/random booster/.test(n)) return "Random Booster";
  if (/booster/.test(n)) return "Booster";
  if (/starter/.test(n)) return "Starter";
  if (/\bset\b|deck|package|pack\b/.test(n)) return "Set";
  const m = text.match(/\b(Random Booster|Booster|Starter)\b/);
  if (m) return m[1] as ScrapedProduct["product_type"];
  return "Other";
}

/**
 * Combo code at the end of a product name.
 *   "Dran Brave S6-60V"       → blade "Dran Brave", prefix "S", ratchet "6-60", bit "V"
 *   "Brachio Whip OW5-70Nr"   → prefix "OW" (over blade + assist blade letters)
 *   "Hells Scythe 3-80F (SP X Bey)" → parenthetical notes are ignored
 */
export function parseComboName(name: string) {
  const clean = name.replace(/\([^)]*\)/g, "").trim();
  const m = clean.match(/^(.*?)\s+([A-Z]{0,2})((?:\d+|M)-\d+)([A-Za-z]{1,4})$/);
  if (!m) return null;
  return { blade: m[1].trim(), prefix: m[2] || null, ratchet: m[3], bitAbbr: m[4] };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Match a single-Bey product's combo code to parts by name (blade, lock chip, main/metal blade), abbreviation (bit),
 * ratchet name, and first letter (assist/over blades, which the code abbreviates to one letter). Page links are
 * used to break ties, since pages also link "how to improve" alternatives.
 */
export function matchComboParts(
  combo: NonNullable<ReturnType<typeof parseComboName>>,
  parts: ScrapedPart[],
  linked: string[],
): string[] | null {
  const linkedSet = new Set(linked);
  const ofKind = (k: PartKind) => parts.filter((p) => p.kind === k);
  // Exact name first; then a unique prefix match, which absorbs small typos on the wiki ("Bliz" for "Blitz").
  const byName = (k: PartKind, name: string) => {
    const exact = ofKind(k).find((p) => norm(p.name) === norm(name));
    if (exact) return exact;
    const n = norm(name);
    const near = ofKind(k).filter((p) => n.length >= 3 && (norm(p.name).startsWith(n.slice(0, -1)) || n.startsWith(norm(p.name))));
    return near.length === 1 ? near[0] : undefined;
  };
  const out: string[] = [];

  const ratchet = ofKind("ratchet").find((p) => p.name === combo.ratchet);
  const bit =
    ofKind("bit").find((p) => p.abbr === combo.bitAbbr) ??
    ofKind("bit").find((p) => p.abbr?.toLowerCase() === combo.bitAbbr.toLowerCase());

  const blade = byName("blade", combo.blade);
  if (blade && !combo.prefix) {
    out.push(blade.slug);
  } else {
    // CX: "<Lock Chip> <Main or Metal Blade>", split at each word boundary until both match.
    const words = combo.blade.split(/\s+/);
    let found = false;
    for (let i = 1; i < words.length && !found; i++) {
      const lock = byName("lock_chip", words.slice(0, i).join(" "));
      const rest = words.slice(i).join(" ");
      const main = byName("main_blade", rest) ?? byName("metal_blade", rest);
      if (lock && main) {
        out.push(lock.slug, main.slug);
        const letters = (combo.prefix ?? "").split("");
        // Metal blades take an Over Blade (first letter) and an Assist Blade (second); main blades take an Assist.
        const slots: PartKind[] = main.kind === "metal_blade" ? ["over_blade", "assist_blade"] : ["assist_blade"];
        letters.forEach((letter, li) => {
          const kind = slots[li] ?? "assist_blade";
          const cands = ofKind(kind).filter((p) => p.name[0]?.toUpperCase() === letter);
          const pick = cands.find((p) => linkedSet.has(p.slug)) ?? (cands.length === 1 ? cands[0] : undefined);
          if (pick) out.push(pick.slug);
        });
        found = true;
      }
    }
    if (!found && blade) out.push(blade.slug);
  }
  // Parts the wiki has no page for are left out; the product then has partial contents.
  if (ratchet) out.push(ratchet.slug);
  if (bit) out.push(bit.slug);
  return out.length ? out : null;
}

/**
 * Parse a product page. Single-Bey products are matched from the combo code in their name; sets use every part
 * linked on the page, plus (in index.ts) the contents of any products they link to.
 */
export function parseProductPage(
  html: string,
  url: string,
  row: { code: string; name: string; release: string | null; note: string | null },
  partIndex: Map<string, ScrapedPart>,
): ScrapedProduct & { linked_products: string[]; linked_parts: string[] } {
  const $ = cheerio.load(html);
  const spec = parseSpec($);
  const linked: string[] = [];
  const linkedProducts: string[] = [];
  const self = slugFromUrl(url);
  $(".entry-content a").each((_, a) => {
    const slug = slugFromUrl($(a).attr("href") ?? "");
    if (!slug) return;
    if (kindFromSlug(slug)) linked.push(slug);
    else if (slug !== self) linkedProducts.push(slug);
  });

  const combo = parseComboName(row.name);
  let contents: string[] = [];
  if (combo) contents = matchComboParts(combo, [...partIndex.values()], linked) ?? [];
  // Fallback for single Beys we couldn't match, and for sets: everything linked on the page.
  if (!contents.length && !combo) contents = [...new Set(linked)];

  const qty = new Map<string, number>();
  for (const s of contents) qty.set(s, (qty.get(s) ?? 0) + 1);
  const text = clean($(".entry-content").text()).slice(0, 4000);

  return {
    slug: self ?? row.code.toLowerCase(),
    code: row.code,
    name: row.name,
    product_type: productType(row.name, text),
    line: lineFromCode(row.code),
    type: toType(spec["TYPE"]),
    spin: (() => {
      const s = spinFrom(spec["SPIN DIRECTION"] ?? "");
      return s === "dual" ? null : s;
    })(),
    weight_g: toNumber(spec["WEIGHT"]),
    release_date: spec["RELEASE DATE"] ?? row.release,
    notes: row.note,
    description: parseDescription($),
    image_url: parseMainImage($),
    source_url: url,
    contents: [...qty].map(([slug, n]) => ({ slug, qty: n })),
    linked_products: [...new Set(linkedProducts)],
    linked_parts: [...new Set(linked)],
  };
}
