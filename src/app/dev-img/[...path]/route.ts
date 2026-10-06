// Local-dev only: serves baked images from .cache/img when Supabase Storage isn't configured.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return new Response("Not found", { status: 404 });
  const parts = (await params).path;
  const file = path.join(process.cwd(), ".cache", "img", ...parts.map((p) => path.basename(p)));
  if (!existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(readFileSync(file), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
