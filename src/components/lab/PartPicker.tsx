"use client";

import { useState } from "react";
import { Sprite } from "../Sprite";
import { KIND_LABEL, type Part, type PartKind } from "@/lib/types";

/** A slot button that opens a searchable sprite grid. */
export function PartPicker({
  kind,
  options,
  value,
  onChange,
  optional = false,
}: {
  kind: PartKind;
  options: Part[];
  value: string | null | undefined;
  onChange: (slug: string | null) => void;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.slug === value) ?? null;
  const needle = q.trim().toLowerCase();
  const list = options.filter((o) => !needle || `${o.name} ${o.abbr ?? ""}`.toLowerCase().includes(needle));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="px-box w-full flex items-center gap-3 p-2 text-left px-press hover:bg-accent/40"
      >
        <Sprite src={current?.image_pixel ?? null} alt={current?.name ?? "empty"} size={48} />
        <span className="flex flex-col min-w-0">
          <span className="font-pixel text-xs text-muted-foreground">{KIND_LABEL[kind]}</span>
          <span className="font-pixel truncate">
            {current ? (current.abbr && kind === "bit" ? `${current.name} (${current.abbr})` : current.name) : "Choose…"}
          </span>
        </span>
        <span className="ml-auto font-pixel" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 px-box-flat p-2 bg-card max-h-80 overflow-auto">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${KIND_LABEL[kind].toLowerCase()}s…`}
            className="w-full font-pixel px-2 py-1 bg-background border-2 border-foreground mb-2"
          />
          {optional && (
            <button
              className="w-full text-left font-pixel px-2 py-1 hover:bg-accent"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              (none)
            </button>
          )}
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-1">
            {list.map((o) => (
              <li key={o.slug}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.slug);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`w-full flex flex-col items-center p-1 hover:bg-accent hover:text-accent-foreground ${o.slug === value ? "bg-accent/60" : ""}`}
                >
                  <Sprite src={o.image_pixel} alt={o.name} size={44} />
                  <span className="font-pixel text-xs leading-tight text-center">
                    {kind === "bit" && o.abbr ? o.abbr : o.name}
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="col-span-full text-sm text-muted-foreground p-2">Nothing matches these filters.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
