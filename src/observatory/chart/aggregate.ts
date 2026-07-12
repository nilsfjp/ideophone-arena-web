// Null-safe aggregation over the live divergence rows (backend contract:
// guessAccuracy / meanRating are null - never 0 - when that side has zero
// observations; the client must distinguish "no data" from "always wrong").
// Every function here returns null for "no data" and never produces NaN.

import type { DivergenceEntry, RatingResponse } from "../../api/types";
import { wilsonFromProportion, type Interval } from "./wilson";

/**
 * The dumbbell keys strictly on the thesis trio. Anything else the endpoint
 * may carry ("PRACTICE" is in the frontend union; TACTILE/MOTION exist in the
 * backend enum) stays out of the rows but remains in recordTotals and the
 * scatter, which don't group by modality.
 */
export const TRIO_MODALITIES = ["AUDITORY", "VISUAL", "INTEROCEPTIVE"] as const;
export type ApiTrioModality = (typeof TRIO_MODALITIES)[number];

/** Below this many live guesses a modality's dot renders hollow (§3.2). */
export const LOW_N_THRESHOLD = 30;

export type ModalityAggregate = {
  /** Weighted Σ(accuracy·count) / Σ(count); null when no rows carry data. */
  accuracy: number | null;
  guessCount: number;
};

export function weightedModalityAccuracy(
  rows: DivergenceEntry[],
): Record<ApiTrioModality, ModalityAggregate> {
  const result = {} as Record<ApiTrioModality, ModalityAggregate>;
  for (const modality of TRIO_MODALITIES) {
    let weighted = 0;
    let count = 0;
    for (const row of rows) {
      if (row.modality !== modality) continue;
      if (row.guessAccuracy === null || row.guessCount <= 0) continue;
      weighted += row.guessAccuracy * row.guessCount;
      count += row.guessCount;
    }
    result[modality] = {
      accuracy: count > 0 ? weighted / count : null,
      guessCount: count,
    };
  }
  return result;
}

/** Header strip totals - every row counts, whatever its modality (§3.1). */
export function recordTotals(rows: DivergenceEntry[]): {
  guesses: number;
  ratings: number;
} {
  let guesses = 0;
  let ratings = 0;
  for (const row of rows) {
    guesses += row.guessCount;
    ratings += row.ratingCount;
  }
  return { guesses, ratings };
}

/** Mean of the player's own 1–7 ratings; no ratings → null (crosshair omits y). */
export function playerMeanRating(ratings: RatingResponse[]): number | null {
  if (ratings.length === 0) return null;
  return ratings.reduce((a, r) => a + r.rating, 0) / ratings.length;
}

export type ZContext = { mean: number; sd: number };

/**
 * Within-layer standardization context (scatter y-axis, adjudicated
 * 2026-07-05: z within study). Needs ≥ 3 values AND spread - the sd of one or
 * two ratings (or of identical values) is noise, so the caller suppresses the
 * layer instead of plotting fake positions.
 */
export function zContext(values: number[]): ZContext | null {
  if (values.length < 3) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1),
  );
  if (sd === 0) return null;
  return { mean, sd };
}

export const zScore = (value: number, ctx: ZContext): number =>
  (value - ctx.mean) / ctx.sd;

export type ArenaScatterPoint = {
  ideophoneId: number;
  /** API romaji, or "#<id>" when the row arrives without one. */
  label: string;
  /** Verbatim kana (displayForm), or null when the row arrives without one. */
  displayForm: string | null;
  gloss: string | null;
  /** Guess accuracy 0–1 (x). */
  x: number;
  /** Mean rating standardized within the plotted arena words (y). */
  z: number;
  /** Native 1–7 mean rating, for tooltips. */
  meanRating: number;
  guessCount: number;
  ratingCount: number;
  wilson: Interval | null;
};

export type ArenaScatterResult = {
  /** Empty when the layer is suppressed (see zContext gate). */
  points: ArenaScatterPoint[];
  /** True when words qualified but were too few / too uniform to standardize. */
  suppressed: boolean;
  eligibleCount: number;
  /** Rows with guesses awaiting their first rating (honest margin note). */
  awaitingRating: number;
  /** Rows with ratings awaiting their first guess. */
  awaitingGuess: number;
  /** Pool words that have not entered the record at all. Matched by romaji -
   * the local record can carry non-pool rows, so this is NOT pool − rows. */
  neverPlayed: number;
  /** Standardization parameters, reused for the session crosshair's y. */
  ratingZContext: ZContext | null;
};

export function buildArenaScatter(
  rows: DivergenceEntry[],
  poolRomaji: readonly string[],
): ArenaScatterResult {
  const eligible = rows.filter(
    (r) =>
      r.guessCount > 0 &&
      r.ratingCount > 0 &&
      r.guessAccuracy !== null &&
      r.meanRating !== null,
  );
  const awaitingRating = rows.filter(
    (r) => r.guessCount > 0 && r.ratingCount === 0,
  ).length;
  const awaitingGuess = rows.filter(
    (r) => r.ratingCount > 0 && r.guessCount === 0,
  ).length;
  const seen = new Set(rows.map((r) => r.romaji).filter(Boolean));
  const neverPlayed = poolRomaji.filter((w) => !seen.has(w)).length;

  const ctx = zContext(eligible.map((r) => r.meanRating as number));
  return {
    points: ctx
      ? eligible.map((r) => ({
          ideophoneId: r.ideophoneId,
          label: r.romaji || `#${r.ideophoneId}`,
          displayForm: r.displayForm || null,
          gloss: r.gloss || null,
          x: r.guessAccuracy as number,
          z: zScore(r.meanRating as number, ctx),
          meanRating: r.meanRating as number,
          guessCount: r.guessCount,
          ratingCount: r.ratingCount,
          wilson: wilsonFromProportion(r.guessAccuracy as number, r.guessCount),
        }))
      : [],
    suppressed: ctx === null && eligible.length > 0,
    eligibleCount: eligible.length,
    awaitingRating,
    awaitingGuess,
    neverPlayed,
    ratingZContext: ctx,
  };
}
