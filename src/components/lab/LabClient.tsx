"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteComboAction, saveComboAction } from "@/app/actions";
import { advantageText, allCombos, type RankedCombo } from "@/lib/matchup";
import { buildContext, isComplete, resolveCombo, scoreCombo } from "@/lib/scoring/score";
import type { ComboParts, OwnedPart, Part, PartKind, SavedCombo } from "@/lib/types";
import { Chip } from "../PartsBrowser";
import { TypeBadge } from "../TypeBadge";
import { BattleArena } from "./BattleArena";
import { ComboStack, comboName } from "./ComboStack";
import { PartPicker } from "./PartPicker";
import { ScoreHud } from "./ScoreHud";
import { SpinArena } from "./SpinArena";

type Mode = "standard" | "cx" | "cx-metal";
const SLOTS: Record<Mode, PartKind[]> = {
  standard: ["blade", "ratchet", "bit"],
  cx: ["lock_chip", "main_blade", "assist_blade", "ratchet", "bit"],
  "cx-metal": ["lock_chip", "metal_blade", "over_blade", "assist_blade", "ratchet", "bit"],
};
const modeOf = (c: ComboParts): Mode => (c.metal_blade ? "cx-metal" : c.main_blade ? "cx" : "standard");

interface Props {
  parts: Part[];
  owned: OwnedPart[];
  owners: string[];
  combos: SavedCombo[];
  admin: boolean;
  initialOwner: string | null;
}

export function LabClient({ parts, owned, owners, combos, admin, initialOwner }: Props) {
  const ctx = useMemo(() => buildContext(parts), [parts]);
  const bySlug = useMemo(() => new Map(parts.map((p) => [p.slug, p])), [parts]);

  // Filters for the pickers.
  const [owner, setOwner] = useState<string | null>(initialOwner);
  const [line, setLine] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  // Two slots: A (main) and B (for compare/battle).
  const [slot, setSlot] = useState<0 | 1>(0);
  const [combosAB, setCombosAB] = useState<[ComboParts, ComboParts]>([{}, {}]);
  const [modes, setModes] = useState<[Mode, Mode]>(["standard", "standard"]);
  const [compare, setCompare] = useState(false);
  const [best, setBest] = useState<RankedCombo[] | null>(null);

  const ownedSlugs = useMemo(
    () => (owner ? new Set(owned.filter((o) => o.owner === owner).map((o) => o.part_slug)) : null),
    [owned, owner],
  );
  const optionsFor = (kind: PartKind) =>
    parts
      .filter((p) => p.kind === kind)
      .filter((p) => !ownedSlugs || ownedSlugs.has(p.slug))
      .filter((p) => !line || p.line === line || kind === "ratchet" || kind === "bit")
      .filter((p) => !type || !p.type || p.type === type || kind === "ratchet" || kind === "lock_chip")
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const resolved = combosAB.map((c) => resolveCombo(c, bySlug));
  const scores = resolved.map((r) => (isComplete(r) ? scoreCombo(r, ctx) : null));

  const setPart = (kind: PartKind, slug: string | null) =>
    setCombosAB((cs) => {
      const next = [...cs] as [ComboParts, ComboParts];
      next[slot] = { ...next[slot], [kind]: slug };
      return next;
    });
  const setMode = (m: Mode) => {
    setModes((ms) => {
      const n = [...ms] as [Mode, Mode];
      n[slot] = m;
      return n;
    });
    setCombosAB((cs) => {
      const n = [...cs] as [ComboParts, ComboParts];
      n[slot] = { ratchet: cs[slot].ratchet, bit: cs[slot].bit };
      return n;
    });
  };
  const load = (c: ComboParts, into: 0 | 1 = slot) => {
    setCombosAB((cs) => {
      const n = [...cs] as [ComboParts, ComboParts];
      n[into] = c;
      return n;
    });
    setModes((ms) => {
      const n = [...ms] as [Mode, Mode];
      n[into] = modeOf(c);
      return n;
    });
    if (into === 1) setCompare(true);
    setSlot(into);
  };

  const findBest = () => {
    const pool = ownedSlugs ? parts.filter((p) => ownedSlugs.has(p.slug)) : parts;
    const ranked = allCombos(pool, ctx).sort((a, b) => b.score.attackTotal - a.score.attackTotal || b.score.chaos - a.score.chaos);
    // Keep variety: at most two combos per blade.
    const perBlade = new Map<string, number>();
    const top: RankedCombo[] = [];
    for (const r of ranked) {
      const key = r.parts.blade ?? r.parts.main_blade ?? r.parts.metal_blade ?? "";
      if ((perBlade.get(key) ?? 0) >= 2) continue;
      perBlade.set(key, (perBlade.get(key) ?? 0) + 1);
      top.push(r);
      if (top.length >= 10) break;
    }
    setBest(top);
  };

  const current = combosAB[slot];
  const mode = modes[slot];
  const names: [string, string] = [comboName(resolved[0]), comboName(resolved[1])];

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <section className="flex flex-wrap gap-2 items-center">
        <span className="font-pixel">Parts from:</span>
        <Chip on={!owner} onClick={() => setOwner(null)}>
          All parts
        </Chip>
        {owners.map((o) => (
          <Chip key={o} on={owner === o} onClick={() => setOwner(o)}>
            ★ {o}
          </Chip>
        ))}
        <span className="w-2" />
        {["BX", "UX", "CX"].map((l) => (
          <Chip key={l} on={line === l} onClick={() => setLine(line === l ? null : l)}>
            {l}
          </Chip>
        ))}
        {["attack", "defense", "stamina", "balance"].map((t) => (
          <Chip key={t} on={type === t} onClick={() => setType(type === t ? null : t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </Chip>
        ))}
      </section>

      <section className="px-box p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-accent/30">
        <div className="flex-1">
          <p className="font-display text-xs sm:text-sm">⚔ BEST ATTACK COMBOS</p>
          <p className="text-sm">
            From {owner ? `${owner}'s parts` : "every part in the database"}, ranked for hitting hard (attack and chaos count most).
          </p>
        </div>
        <button onClick={findBest} className="font-pixel text-lg px-4 py-2 bg-primary text-primary-foreground border-4 border-foreground px-press">
          Find them
        </button>
      </section>
      {best && (
        <section>
          {best.length === 0 ? (
            <p className="text-muted-foreground">No complete combos: this collection needs at least one blade, ratchet and bit.</p>
          ) : (
            <ol className="grid sm:grid-cols-2 gap-2">
              {best.map((r, i) => {
                const rc = resolveCombo(r.parts, bySlug);
                return (
                  <li key={i} className="px-box-flat p-2 flex items-center gap-2">
                    <span className="font-display text-xs w-6">{i + 1}.</span>
                    <span className="flex-1 font-pixel leading-tight">
                      {comboName(rc)}
                      <span className="block text-xs text-muted-foreground">
                        ATK {r.score.attack} · Chaos {r.score.chaos} · {r.score.total} pts
                      </span>
                    </span>
                    <TypeBadge type={r.score.type} />
                    <button className="font-pixel underline text-sm" onClick={() => load(r.parts, 0)}>
                      Load
                    </button>
                    <button className="font-pixel underline text-sm" onClick={() => load(r.parts, 1)}>
                      vs
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {/* Slot tabs */}
      <div className="flex gap-2 items-center flex-wrap">
        <Chip on={slot === 0} onClick={() => setSlot(0)}>
          Combo A
        </Chip>
        {compare && (
          <Chip on={slot === 1} onClick={() => setSlot(1)}>
            Combo B
          </Chip>
        )}
        <button
          className="font-pixel underline ml-auto"
          onClick={() => {
            setCompare((c) => !c);
            setSlot(compare ? 0 : 1);
          }}
        >
          {compare ? "Stop comparing" : "+ Compare with another combo"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Builder */}
        <section className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <Chip on={mode === "standard"} onClick={() => setMode("standard")}>
              BX / UX blade
            </Chip>
            <Chip on={mode === "cx"} onClick={() => setMode("cx")}>
              CX blade
            </Chip>
            <Chip on={mode === "cx-metal"} onClick={() => setMode("cx-metal")}>
              CX metal blade
            </Chip>
          </div>
          {mode !== "standard" && (
            <p className="text-sm text-muted-foreground">
              Custom Line blades are built from pieces: a Lock Chip holds a Main (or Metal) Blade and an Assist Blade together.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-2">
            {SLOTS[mode].map((k) => (
              <PartPicker
                key={`${slot}-${k}`}
                kind={k}
                options={optionsFor(k)}
                value={current[k]}
                onChange={(s) => setPart(k, s)}
                optional={k === "lock_chip" || k === "assist_blade" || k === "over_blade"}
              />
            ))}
          </div>
          <div className="flex gap-4 items-start mt-2">
            <ComboStack combo={resolved[slot]} />
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-lg">{comboName(resolved[slot])}</p>
              {scores[slot] && <SaveCombo admin={admin} owners={owners} parts={current} score={scores[slot]} defaultName={comboName(resolved[slot])} />}
            </div>
          </div>
        </section>

        {/* Result */}
        <section className="px-box p-4 flex flex-col gap-4">
          {scores[slot] ? (
            <>
              <ScoreHud score={scores[slot]!} />
              <SpinArena combo={resolved[slot]} score={scores[slot]} />
            </>
          ) : (
            <div className="grid place-items-center text-center gap-2 py-8">
              <p className="font-display text-sm">INSERT PARTS</p>
              <p className="text-muted-foreground">Pick a blade, a ratchet and a bit to see the score.</p>
              <SpinArena combo={resolved[slot]} score={null} />
            </div>
          )}
        </section>
      </div>

      {compare && (
        <section className="px-box p-4">
          <h2 className="font-display text-sm mb-3">⚔ COMPARE</h2>
          {scores[0] && scores[1] ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
              <div>
                <p className="font-pixel text-lg text-primary">A · {names[0]}</p>
                <ScoreHud score={scores[0]} compact />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="font-pixel text-center max-w-[16rem]">{advantageText(scores[0].type, scores[1].type, "A", "B")}</p>
                <BattleArena a={{ combo: resolved[0], score: scores[0] }} b={{ combo: resolved[1], score: scores[1] }} names={names} />
              </div>
              <div>
                <p className="font-pixel text-lg text-secondary">B · {names[1]}</p>
                <ScoreHud score={scores[1]} compact />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Complete both Combo A and Combo B to compare them and battle.</p>
          )}
        </section>
      )}

      <SavedList combos={combos} bySlug={bySlug} ctx={ctx} admin={admin} onLoad={load} />
    </div>
  );
}

function SaveCombo({
  admin,
  owners,
  parts,
  score,
  defaultName,
}: {
  admin: boolean;
  owners: string[];
  parts: ComboParts;
  score: unknown;
  defaultName: string;
}) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(owners[0] ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!admin) return null;
  return (
    <form
      className="flex flex-wrap gap-2 mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            await saveComboAction({ name: name || defaultName, owner: owner || null, parts, scores: score });
            setMsg("Saved!");
            setName("");
          } catch (err) {
            setMsg(err instanceof Error ? err.message : String(err));
          }
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={defaultName}
        className="flex-1 min-w-0 font-pixel px-2 py-1 bg-card border-2 border-foreground"
        aria-label="Combo name"
      />
      <select value={owner} onChange={(e) => setOwner(e.target.value)} className="font-pixel px-2 py-1 bg-card border-2 border-foreground" aria-label="Owner">
        {owners.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <button disabled={pending} className="font-pixel px-3 py-1 bg-secondary text-secondary-foreground border-2 border-foreground px-press">
        Save
      </button>
      {msg && <span className="font-pixel text-sm self-center">{msg}</span>}
    </form>
  );
}

function SavedList({
  combos,
  bySlug,
  ctx,
  admin,
  onLoad,
}: {
  combos: SavedCombo[];
  bySlug: Map<string, Part>;
  ctx: ReturnType<typeof buildContext>;
  admin: boolean;
  onLoad: (c: ComboParts, into: 0 | 1) => void;
}) {
  const [pending, start] = useTransition();
  if (!combos.length) return null;
  return (
    <section>
      <h2 className="font-display text-sm mb-2">SAVED COMBOS</h2>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {combos.map((c) => {
          const r = resolveCombo(c.parts, bySlug);
          const s = isComplete(r) ? scoreCombo(r, ctx) : null;
          return (
            <li key={c.id} className="px-box-flat p-2 flex flex-col gap-1">
              <span className="font-pixel">{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {comboName(r)} {c.owner ? `· ★ ${c.owner}` : ""} {s ? `· ${s.total} pts` : ""}
              </span>
              <span className="flex gap-3 font-pixel text-sm">
                <button className="underline" onClick={() => onLoad(c.parts, 0)}>
                  Load as A
                </button>
                <button className="underline" onClick={() => onLoad(c.parts, 1)}>
                  Load as B
                </button>
                {admin && (
                  <button className="underline text-destructive ml-auto" disabled={pending} onClick={() => start(() => deleteComboAction(c.id))}>
                    Delete
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
