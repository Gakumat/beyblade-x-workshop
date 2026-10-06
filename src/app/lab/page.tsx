import type { Metadata } from "next";
import { LabClient } from "@/components/lab/LabClient";
import { getCatalog, getCombos, getOwned, getOwners } from "@/lib/data";
import { isAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Combo Lab" };
export const dynamic = "force-dynamic";

export default async function LabPage({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const [{ parts }, owned, owners, combos, admin, sp] = await Promise.all([
    getCatalog(),
    getOwned(),
    getOwners(),
    getCombos(),
    isAdmin(),
    searchParams,
  ]);
  return (
    <div>
      <h1 className="font-display text-lg sm:text-xl mb-4">COMBO LAB</h1>
      <LabClient
        parts={parts}
        owned={owned}
        owners={owners}
        combos={combos}
        admin={admin}
        initialOwner={sp.owner && owners.includes(sp.owner) ? sp.owner : null}
      />
    </div>
  );
}
