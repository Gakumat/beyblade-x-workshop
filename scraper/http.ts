// Polite, cached HTTP for the scraper: 1 request/second, responses cached on disk so re-runs are cheap.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(".cache", "http");
const UA = "BeybladeXWorkshop/0.1 (personal fan project; contact via github.com/Gakumat)";
const MIN_GAP_MS = 1000;

let last = 0;
async function throttle() {
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}

function cachePath(url: string, ext: string) {
  return path.join(CACHE_DIR, createHash("sha1").update(url).digest("hex") + ext);
}

/** Fetch HTML, using the disk cache unless `fresh` is set (or the cache is older than maxAgeDays). */
export async function getHtml(url: string, { fresh = false, maxAgeDays = 7 } = {}): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = cachePath(url, ".html");
  if (!fresh && existsSync(file)) {
    const { mtimeMs } = await import("node:fs").then((fs) => fs.statSync(file));
    if (Date.now() - mtimeMs < maxAgeDays * 86400_000) return readFileSync(file, "utf8");
  }
  await throttle();
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  writeFileSync(file, html);
  return html;
}

/** Fetch binary (images). Cached forever: the source files don't change once uploaded. */
export async function getBinary(url: string): Promise<Buffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = cachePath(url, ".bin");
  if (existsSync(file)) return readFileSync(file);
  await throttle();
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  return buf;
}

/** Checks robots.txt for a blanket disallow of our paths. Minimal parser: User-agent * groups only. */
export async function robotsAllows(origin: string, pathname = "/"): Promise<boolean> {
  try {
    await throttle();
    const res = await fetch(origin + "/robots.txt", { headers: { "user-agent": UA } });
    if (res.status === 404) return true;
    if (!res.ok) return false;
    let applies = false;
    for (const raw of (await res.text()).split(/\r?\n/)) {
      const line = raw.split("#")[0].trim();
      const [k, ...rest] = line.split(":");
      const v = rest.join(":").trim();
      if (/^user-agent$/i.test(k)) applies = v === "*";
      else if (applies && /^disallow$/i.test(k) && v && pathname.startsWith(v)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
