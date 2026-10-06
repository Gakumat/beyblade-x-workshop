import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OwnerAdmin } from "@/components/OwnerAdmin";
import { getLastScrape, getOwners } from "@/lib/data";
import { hasSupabase, isAdmin } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { RunScrape } from "./RunScrape";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

type Summary = {
  parts?: number;
  products?: number;
  newParts?: string[];
  changedParts?: string[];
  newProducts?: string[];
  changedProducts?: string[];
  failed?: { url: string; error: string }[];
  noPage?: string[];
  error?: string;
};

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/login");
  const [last, owners] = await Promise.all([getLastScrape(), getOwners()]);
  const s = (last?.summary ?? {}) as Summary;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-lg sm:text-xl">ADMIN</h1>
        {hasSupabase() && (
          <form action={signOut} className="ml-auto">
            <button className="font-pixel underline">Sign out</button>
          </form>
        )}
      </div>

      <section className="px-box p-4">
        <h2 className="font-pixel text-2xl">Parts data</h2>
        <RunScrape />
        <p className="text-sm text-muted-foreground mt-2">
          Or run <code className="font-pixel">npm run scrape</code> on your computer. Re-runs are safe: they update parts and products
          and never touch collections or saved combos.
        </p>
      </section>

      <section className="px-box p-4">
        <h2 className="font-pixel text-2xl">Last scrape</h2>
        {!last ? (
          <p>No scrape yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <p className="font-pixel">
              {new Date(last.started_at).toLocaleString("en-AU")} · <b>{last.status}</b>
            </p>
            {s.error && <p className="text-destructive">{s.error}</p>}
            {s.parts != null && (
              <ul className="font-pixel">
                <li>
                  Parts: {s.parts} ({s.newParts?.length ?? 0} new, {s.changedParts?.length ?? 0} changed)
                </li>
                <li>
                  Products: {s.products} ({s.newProducts?.length ?? 0} new, {s.changedProducts?.length ?? 0} changed)
                </li>
                <li>Failed pages: {s.failed?.length ?? 0}</li>
              </ul>
            )}
            {!!s.newParts?.length && <Details title="New parts" items={s.newParts} />}
            {!!s.newProducts?.length && <Details title="New products" items={s.newProducts} />}
            {!!s.failed?.length && <Details title="Failures" items={s.failed.map((f) => `${f.url}: ${f.error}`)} />}
            {!!s.noPage?.length && <Details title="Listed without a wiki page (skipped)" items={s.noPage} />}
          </div>
        )}
      </section>

      <OwnerAdmin owners={owners} />
    </div>
  );
}

function Details({ title, items }: { title: string; items: string[] }) {
  return (
    <details>
      <summary className="font-pixel cursor-pointer">
        {title} ({items.length})
      </summary>
      <ul className="text-sm list-disc pl-6 mt-1 break-all">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </details>
  );
}
