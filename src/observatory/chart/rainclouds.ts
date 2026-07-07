// Pure raincloud math for the per-modality rating distributions
// (SPEC-stats-dashboard §3.4). Works over a length-7 counts array
// (counts[i] = number of ratings equal to i+1), which is exactly the shape the
// backend's rating-distributions endpoint carries per modality AND the shape
// the vendored thesis reference is pre-aggregated into — so live and thesis
// layers normalize through the same helpers. Every function is null/empty-safe
// and never produces NaN (thin data is the app's register, not a crash).

import type { RatingDistributionsResponse } from "../../api/types";
import { TRIO_MODALITIES, type ApiTrioModality } from "./aggregate";
import { jitterFor } from "./jitter";

/** Rating scale is fixed 1..7. */
export const RATING_MIN = 1;
export const RATING_MAX = 7;

/**
 * Raw-dot budget per layer per tier. Above this the cloud is a seeded,
 * per-value-proportional subsample (shape preserved, `shown < total` disclosed
 * in the figcaption) — never a silent truncation, and no giant markup for the
 * string-asserting tests.
 */
export const DOT_CAP = 80;

/**
 * Length-7 counts for one modality, or null when the endpoint omitted it
 * (dense grid: a modality with no ratings carries no cells at all). Reads
 * ratingValue 1..7 into index 0..6; out-of-range values are ignored.
 */
export function countsForModality(
  dist: RatingDistributionsResponse,
  modality: string,
): number[] | null {
  const cells = dist.distributions.filter((c) => c.modality === modality);
  if (cells.length === 0) return null;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const cell of cells) {
    if (cell.ratingValue >= RATING_MIN && cell.ratingValue <= RATING_MAX) {
      counts[cell.ratingValue - 1] += cell.count;
    }
  }
  return counts;
}

/** Trio modalities the live response actually carries, as length-7 counts. */
export function countsByModality(
  dist: RatingDistributionsResponse,
): Map<ApiTrioModality, number[]> {
  const map = new Map<ApiTrioModality, number[]>();
  for (const modality of TRIO_MODALITIES) {
    const counts = countsForModality(dist, modality);
    if (counts) map.set(modality, counts);
  }
  return map;
}

/** value v (1..7) repeated counts[v-1] times, ascending — feeds KDE + quartiles. */
export function expandCounts(counts: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < counts.length; i += 1) {
    for (let k = 0; k < counts[i]; k += 1) out.push(i + 1);
  }
  return out;
}

/** Type-7 linear-interpolation quantile — the same convention as kde.ts. */
function quantile(sorted: number[], q: number): number {
  const n = sorted.length;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export type Quartiles = {
  q1: number;
  median: number;
  q3: number;
  min: number;
  max: number;
};

/**
 * Quartile box from counts. null when the tier is empty (no box drawn). A
 * single distinct value collapses the box onto that value (honest, no NaN).
 */
export function quartilesFromCounts(counts: readonly number[]): Quartiles | null {
  const values = expandCounts(counts);
  if (values.length === 0) return null;
  return {
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    min: values[0],
    max: values[values.length - 1],
  };
}

export type RaincloudDot = { value: number; jitter: number };

export type DotSample = {
  dots: RaincloudDot[];
  /** Dots actually plotted. */
  shown: number;
  /** Ratings behind the tier (Σ counts). */
  total: number;
};

/**
 * Seeded raw dots under DOT_CAP. Under the cap every rating is a dot; over it,
 * each value keeps a proportional (and, if present at all, ≥1) share so the
 * cloud's shape survives the thinning. Deterministic via jitterFor.
 */
export function dotSample(
  seedKey: string,
  counts: readonly number[],
  cap: number = DOT_CAP,
): DotSample {
  const total = counts.reduce((a, c) => a + c, 0);
  const dots: RaincloudDot[] = [];
  for (let i = 0; i < counts.length; i += 1) {
    const count = counts[i];
    if (count <= 0) continue;
    const value = i + 1;
    const alloc =
      total <= cap
        ? count
        : Math.min(count, Math.max(1, Math.round((cap * count) / total)));
    for (let k = 0; k < alloc; k += 1) {
      dots.push({ value, jitter: jitterFor(seedKey, value, k) });
    }
  }
  return { dots, shown: dots.length, total };
}
