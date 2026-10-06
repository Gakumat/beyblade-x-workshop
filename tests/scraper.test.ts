import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import {
  kindFromSlug,
  matchComboParts,
  nameFromSlug,
  parseComboName,
  parseOfficialStats,
  parsePartList,
  parseSpec,
} from "../scraper/sources/beybladeWiki";
import { typeFromOfficial } from "../scraper/normalise";
import type { ScrapedPart } from "../scraper/types";

// Small HTML snippets with the same structure as beyblade.wiki pages.
const PART_PAGE = `<div class="entry-content">
<p><strong>SYSTEM :</strong> BASIC LINE<br><strong>PRODUCT CODE :</strong> BX-03<br><strong>PART :</strong> BIT<br>
<strong>ABBR.</strong> : B<br><strong>TYPE :</strong> STAMINA<br><strong>WEIGHT :</strong> Approx. 2,1 g</p>
<h3>Ball Stats (Official)</h3>
<figure class="wp-block-table"><table><thead><tr><th>Attack</th><th>Defense</th><th>Stamina</th><th>Dash</th><th>Burst Resistance</th></tr></thead>
<tbody><tr><td>15</td><td>25</td><td>50</td><td>10</td><td>30</td></tr></tbody></table></figure>
</div>`;

const LIST_PAGE = `<div class="entry-content"><table>
<tr><th>Product Code</th><th>Abbreviation</th><th>Bit Name</th><th>System</th></tr>
<tr><td><a href="https://beyblade.wiki/dran-sword/">BX-01</a></td><td>F</td><td><a href="https://beyblade.wiki/flat-bit/">Flat</a></td><td>XGS</td></tr>
<tr><td>CX-08</td><td>CX-08</td><td><a href="https://beyblade.wiki/wall-ball-bit/">Wall Ball</a></td><td>CL</td></tr>
</table></div>`;

const sp = (p: Partial<ScrapedPart> & Pick<ScrapedPart, "slug" | "kind" | "name">) => ({ abbr: null, ...p }) as ScrapedPart;
const PARTS: ScrapedPart[] = [
  sp({ slug: "dran-sword-blade", kind: "blade", name: "Dran Sword" }),
  sp({ slug: "wizard-lock-chip", kind: "lock_chip", name: "Wizard" }),
  sp({ slug: "arc-main-blade", kind: "main_blade", name: "Arc" }),
  sp({ slug: "brave-main-blade", kind: "main_blade", name: "Brave" }),
  sp({ slug: "round-assist-blade", kind: "assist_blade", name: "Round" }),
  sp({ slug: "slash-assist-blade", kind: "assist_blade", name: "Slash" }),
  sp({ slug: "bahamut-lock-chip", kind: "lock_chip", name: "Bahamut" }),
  sp({ slug: "blitz-metal-blade", kind: "metal_blade", name: "Blitz" }),
  sp({ slug: "break-over-blade", kind: "over_blade", name: "Break" }),
  sp({ slug: "knuckle-assist-blade", kind: "assist_blade", name: "Knuckle" }),
  sp({ slug: "3-60-ratchet", kind: "ratchet", name: "3-60" }),
  sp({ slug: "4-55-ratchet", kind: "ratchet", name: "4-55" }),
  sp({ slug: "1-50-ratchet", kind: "ratchet", name: "1-50" }),
  sp({ slug: "flat-bit", kind: "bit", name: "Flat", abbr: "F" }),
  sp({ slug: "low-orb-bit", kind: "bit", name: "Low Orb", abbr: "LO" }),
  sp({ slug: "ignition-bit", kind: "bit", name: "Ignition", abbr: "I" }),
];

describe("beyblade.wiki parsing", () => {
  it("reads the spec block and official stats", () => {
    const $ = cheerio.load(PART_PAGE);
    expect(parseSpec($)).toMatchObject({ "PRODUCT CODE": "BX-03", ABBR: "B", TYPE: "STAMINA", WEIGHT: "Approx. 2,1 g" });
    expect(parseOfficialStats($)).toEqual({ attack: 15, defense: 25, stamina: 50, dash: 10, burst: 30 });
  });

  it("reads list tables, ignoring codes in the abbreviation column", () => {
    const rows = parsePartList(LIST_PAGE, "bit");
    expect(rows.map((r) => [r.name, r.abbr, r.url])).toEqual([
      ["Flat", "F", "https://beyblade.wiki/flat-bit/"],
      ["Wall Ball", null, "https://beyblade.wiki/wall-ball-bit/"],
    ]);
  });

  it("knows part kinds and names from slugs", () => {
    expect(kindFromSlug("slash-assist-blade")).toBe("assist_blade");
    expect(kindFromSlug("whip-metal-blade")).toBe("metal_blade");
    expect(kindFromSlug("dran-sword-blade")).toBe("blade");
    expect(kindFromSlug("dran-sword")).toBeNull();
    expect(nameFromSlug("phoenix-feather-blade")).toBe("Phoenix Feather");
  });

  it("parses combo codes", () => {
    expect(parseComboName("Dran Brave S6-60V")).toEqual({ blade: "Dran Brave", prefix: "S", ratchet: "6-60", bitAbbr: "V" });
    expect(parseComboName("Hells Scythe 3-80F (SP X Bey)")?.blade).toBe("Hells Scythe");
    expect(parseComboName("Tricera Press M-85BS")?.ratchet).toBe("M-85");
    expect(parseComboName("3on3 Deck Set")).toBeNull();
  });

  it("matches product contents by name, not by the first link on the page", () => {
    // The Wizard Arc page also links Brave/Slash in its text; those must not be picked.
    const linked = ["brave-main-blade", "slash-assist-blade", "round-assist-blade"];
    expect(matchComboParts(parseComboName("Wizard Arc R4-55LO")!, PARTS, linked)).toEqual([
      "wizard-lock-chip",
      "arc-main-blade",
      "round-assist-blade",
      "4-55-ratchet",
      "low-orb-bit",
    ]);
    expect(matchComboParts(parseComboName("Dran Sword 3-60F")!, PARTS, [])).toEqual(["dran-sword-blade", "3-60-ratchet", "flat-bit"]);
  });

  it("handles metal blades (over + assist letters) and wiki typos", () => {
    expect(matchComboParts(parseComboName("Bahamut Bliz BK1-50I")!, PARTS, [])).toEqual([
      "bahamut-lock-chip",
      "blitz-metal-blade",
      "break-over-blade",
      "knuckle-assist-blade",
      "1-50-ratchet",
      "ignition-bit",
    ]);
  });

  it("derives a type from official stats", () => {
    expect(typeFromOfficial({ attack: 60, defense: 20, stamina: 20 })).toBe("attack");
    expect(typeFromOfficial({ attack: 30, defense: 32, stamina: 20 })).toBe("balance");
    expect(typeFromOfficial({ attack: 30 })).toBeNull();
  });
});
