// Word Mint presentation logic, kept pure so the score bands and the chip-row
// membership rule can be proven without a DOM (vitest runs in `node`).
//
// Nothing here computes phonology. The backend owns `similarityScore` and every
// `features[].yours/target/matched`; this module only decides what to SHOW.
import type { FeatureKey, FeatureMatch } from "./api/types";
import {
  MINT_BAND_ALMOST,
  MINT_BAND_DIFFERENT,
  MINT_BAND_MOST,
  MINT_BAND_SOME,
  MINT_CHIP_FINAL_N,
  MINT_CHIP_HEAVY_VOWEL_RATIO,
  MINT_CHIP_LENGTH_PREFIX,
  MINT_CHIP_LENGTH_SUFFIX,
  MINT_CHIP_REDUP,
  MINT_CHIP_RI_SUFFIX,
  MINT_CHIP_SOKUON,
  MINT_CHIP_VOICED_ONSET,
} from "./experimentText";

// The player types roman letters; the server is authoritative. This mirrors the
// backend's `^[a-z]{2,24}$` so an obviously malformed try never costs a request
// - it is NOT a phonology check (mora segmentation happens server-side only).
const ROMAJI_INPUT_PATTERN = /^[a-z]{2,24}$/;

// Lowercase before testing AND before sending: the backend trims and lowercases
// too, and a mobile keyboard that auto-capitalises the first letter must not
// produce a parse error the server would never have raised.
export function normalizeMintInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isMintInputWellFormed(raw: string): boolean {
  return ROMAJI_INPUT_PATTERN.test(normalizeMintInput(raw));
}

// Section 8.2 (as amended by NIL-85) makes each band a standalone caption beside the
// score figure, which carries the numeral on its own (2.3.4).
export function scoreBandCaption(score: number): string {
  if (score >= 85) return MINT_BAND_ALMOST;
  if (score >= 60) return MINT_BAND_MOST;
  if (score >= 35) return MINT_BAND_SOME;
  return MINT_BAND_DIFFERENT;
}

// The two continuous features are always in the chip row: they have no "absent"
// state to be shared.
const CONTINUOUS_FEATURES: readonly FeatureKey[] = ["heavyVowelRatio", "moraCount"];

function isContinuous(feature: FeatureKey): boolean {
  return CONTINUOUS_FEATURES.includes(feature);
}

// A boolean feature is "present" if either form has it.
function isPresentInEither(match: FeatureMatch): boolean {
  return match.yours === true || match.target === true;
}

// Chip-row membership (2.3.5): only features present in EITHER form, plus the
// two continuous ones. For pikapika -> dokidoki, four of seven features "match"
// as shared absences, and a row of green chips celebrating what neither word has
// reads as noise. Shared absences still score, and still appear in the table
// twin: the chips tell the shape story, the table proves the arithmetic.
//
// Order follows the mockup: matched chips first, then unmatched, each group in
// the frozen 8.3 feature order (which is the order the API returns).
export function chipsFor(features: FeatureMatch[]): FeatureMatch[] {
  const shown = features.filter(
    (match) => isContinuous(match.feature) || isPresentInEither(match),
  );
  return [
    ...shown.filter((match) => match.matched),
    ...shown.filter((match) => !match.matched),
  ];
}

// `LENGTH · {n} MORAE` interpolates YOUR mora count: the chip row is the shape
// story of the word you invented. The table twin carries both counts.
export function chipLabel(match: FeatureMatch): string {
  switch (match.feature) {
    case "redup":
      return MINT_CHIP_REDUP;
    case "sokuon":
      return MINT_CHIP_SOKUON;
    case "finalN":
      return MINT_CHIP_FINAL_N;
    case "riSuffix":
      return MINT_CHIP_RI_SUFFIX;
    case "voicedOnset":
      return MINT_CHIP_VOICED_ONSET;
    case "heavyVowelRatio":
      return MINT_CHIP_HEAVY_VOWEL_RATIO;
    case "moraCount":
      return `${MINT_CHIP_LENGTH_PREFIX}${String(match.yours)}${MINT_CHIP_LENGTH_SUFFIX}`;
  }
}

// In the table twin the count moves to the value column, so the row is labelled
// with the bare noun - derived from the frozen chip prefix, not a second literal.
const MORA_TABLE_LABEL = MINT_CHIP_LENGTH_PREFIX.replace(/\s*·\s*$/u, "");

export function featureTableLabel(match: FeatureMatch): string {
  return match.feature === "moraCount" ? MORA_TABLE_LABEL : chipLabel(match);
}

// Presentational only. The wire carries heavyVowelRatio at 2-dp scale; booleans
// are the mockup's yes/no; moraCount reads with its unit.
export function featureTableValue(
  feature: FeatureKey,
  value: boolean | number,
): string {
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  if (feature === "moraCount") {
    return `${value}${MINT_CHIP_LENGTH_SUFFIX}`;
  }
  return value.toFixed(2);
}
