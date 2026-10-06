"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as db from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";
import type { ComboParts } from "@/lib/types";

const ownerName = z.string().trim().min(1).max(40);

function refresh() {
  revalidatePath("/", "layout");
}

export async function addOwnerAction(name: string) {
  await requireAdmin();
  await db.addOwner(ownerName.parse(name));
  refresh();
}

export async function renameOwnerAction(from: string, to: string) {
  await requireAdmin();
  await db.renameOwner(ownerName.parse(from), ownerName.parse(to));
  refresh();
}

export async function deleteOwnerAction(name: string) {
  await requireAdmin();
  await db.deleteOwner(ownerName.parse(name));
  refresh();
}

/** +1 / -1 on a single part. */
export async function adjustPartAction(owner: string, partSlug: string, delta: number) {
  await requireAdmin();
  await db.adjustOwned(ownerName.parse(owner), [{ part_slug: z.string().parse(partSlug), delta: Math.sign(delta) }]);
  refresh();
}

/** Adding a product adds everything in the box. */
export async function addProductAction(owner: string, productSlug: string) {
  await requireAdmin();
  const { contents } = await db.getCatalog();
  const items = contents.filter((c) => c.product_slug === productSlug);
  if (!items.length) throw new Error("That product has no known contents.");
  await db.adjustOwned(
    ownerName.parse(owner),
    items.map((c) => ({ part_slug: c.part_slug, delta: c.qty })),
  );
  refresh();
}

export async function saveComboAction(input: { name: string; owner: string | null; parts: ComboParts; scores: unknown }) {
  await requireAdmin();
  await db.saveCombo({ ...input, name: z.string().trim().min(1).max(60).parse(input.name) });
  refresh();
}

export async function deleteComboAction(id: string) {
  await requireAdmin();
  await db.deleteCombo(id);
  refresh();
}
