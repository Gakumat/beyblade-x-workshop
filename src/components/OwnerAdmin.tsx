"use client";

import { useState, useTransition } from "react";
import { addOwnerAction, deleteOwnerAction, renameOwnerAction } from "@/app/actions";

/** Admin-only owner tag management: add, rename, delete. */
export function OwnerAdmin({ owners }: { owners: string[] }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });

  return (
    <section className="mt-8 px-box-flat p-4">
      <h2 className="font-pixel text-lg">Owner tags (admin)</h2>
      <form
        className="flex gap-2 mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) run(async () => {
            await addOwnerAction(name);
            setName("");
          });
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New owner name"
          className="flex-1 font-pixel px-2 py-1 bg-card border-2 border-foreground"
        />
        <button disabled={pending} className="font-pixel px-3 py-1 bg-primary text-primary-foreground border-2 border-foreground px-press">
          Add
        </button>
      </form>
      <ul className="mt-3 flex flex-col gap-2">
        {owners.map((o) => (
          <li key={o} className="flex items-center gap-2 font-pixel">
            <span className="flex-1">{o}</span>
            <button
              className="underline text-sm"
              disabled={pending}
              onClick={() => {
                const to = prompt(`Rename ${o} to:`, o);
                if (to && to !== o) run(() => renameOwnerAction(o, to));
              }}
            >
              Rename
            </button>
            <button
              className="underline text-sm text-destructive"
              disabled={pending}
              onClick={() => confirm(`Delete ${o} and their whole collection?`) && run(() => deleteOwnerAction(o))}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-destructive mt-2">{error}</p>}
    </section>
  );
}
