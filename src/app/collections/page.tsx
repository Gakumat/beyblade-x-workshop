import type { Metadata } from "next";
import Link from "next/link";
import { OwnerAdmin } from "@/components/OwnerAdmin";
import { getOwned, getOwners } from "@/lib/data";
import { isAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const [owners, owned, admin] = await Promise.all([getOwners(), getOwned(), isAdmin()]);
  const count = (o: string) => owned.filter((x) => x.owner === o).reduce((t, x) => t + x.qty, 0);
  return (
    <div>
      <h1 className="font-display text-lg sm:text-xl mb-4">COLLECTIONS</h1>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {owners.map((o) => (
          <li key={o}>
            <Link href={`/collections/${encodeURIComponent(o)}`} className="px-box block p-4 px-press hover:bg-accent/40">
              <span className="font-display text-sm">★ {o.toUpperCase()}</span>
              <span className="block font-pixel mt-2 text-muted-foreground">{count(o)} parts</span>
            </Link>
          </li>
        ))}
        {!owners.length && <li className="text-muted-foreground">No owners yet.</li>}
      </ul>
      {admin && <OwnerAdmin owners={owners} />}
    </div>
  );
}
