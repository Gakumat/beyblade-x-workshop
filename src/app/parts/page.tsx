import type { Metadata } from "next";
import { PartsBrowser } from "@/components/PartsBrowser";
import { getCatalog, getOwned, getOwners } from "@/lib/data";

export const metadata: Metadata = { title: "Parts Database" };
export const revalidate = 300;

export default async function PartsPage() {
  const [{ parts, products }, owned, owners] = await Promise.all([getCatalog(), getOwned(), getOwners()]);
  return (
    <div>
      <h1 className="font-display text-lg sm:text-xl mb-4">PARTS DATABASE</h1>
      <PartsBrowser parts={parts} products={products} owned={owned} owners={owners} />
    </div>
  );
}
