import type { Metadata } from "next";
import { FinderClient } from "@/components/finder/FinderClient";
import { getCatalog, getOwned, getOwners } from "@/lib/data";

export const metadata: Metadata = { title: "Bey Finder" };
export const revalidate = 60;

export default async function FinderPage() {
  const [catalog, owned, owners] = await Promise.all([getCatalog(), getOwned(), getOwners()]);
  return <FinderClient {...catalog} owned={owned} owners={owners} />;
}
