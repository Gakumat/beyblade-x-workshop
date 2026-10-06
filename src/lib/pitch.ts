// Friendly, jargon-free pitches for the Bey Finder.
import type { ComboScore } from "./scoring/score";
import type { Part } from "./types";

const OPENERS: Record<string, string> = {
  attack: "This one is all about hitting hard.",
  defense: "This one is a wall: other Beys bounce off it.",
  stamina: "This one just keeps on spinning.",
  balance: "This one can do a bit of everything.",
};

const MOVES: Record<string, string> = {
  aggressive: "It zooms around the edge of the stadium and slams into whatever it finds.",
  centre: "It sits calmly in the middle and lets the other Bey wear itself out.",
  unpredictable: "It moves in weird, wild ways, so nobody can guess what it'll do next.",
  balanced: "It moves around a little, then settles down.",
};

/** Two or three short sentences selling a product's stock combo. */
export function pitch(score: ComboScore, bit: Part | undefined, blade: Part | undefined): string {
  const bits = [OPENERS[score.type]];
  if (bit?.behaviour && MOVES[bit.behaviour]) bits.push(MOVES[bit.behaviour]);
  if (score.gimmicks.length) bits.push(`Cool trick: ${score.gimmicks[0]}.`);
  else if (blade?.line === "CX") bits.push("Its blade is built from swappable pieces, so you can remix it later.");
  if (score.chaos >= 60) bits.push("Chaotic and fun to watch!");
  return bits.join(" ");
}

/** First one or two sentences of a description, for "what does this gimmick do?" blurbs. */
export function shortExplain(text: string | null, maxSentences = 2): string | null {
  if (!text) return null;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  // Skip the "First released in…" sentence, which says when, not what.
  const useful = sentences.filter((s) => !/^\s*first released/i.test(s));
  return (useful.length ? useful : sentences).slice(0, maxSentences).join(" ").trim();
}
