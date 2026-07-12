import { describe, expect, it } from "vitest";
import type { DivergenceEntry, RatingResponse } from "../../api/types";
import {
  buildArenaScatter,
  playerMeanRating,
  recordTotals,
  weightedModalityAccuracy,
  zContext,
  zScore,
} from "./aggregate";

function makeRow(overrides: Partial<DivergenceEntry> = {}): DivergenceEntry {
  return {
    ideophoneId: 1,
    romaji: "gosogoso",
    gloss: "with a rustling sound",
    modality: "AUDITORY",
    guessAccuracy: 0.6,
    guessCount: 10,
    meanRating: 4.5,
    ratingCount: 5,
    ...overrides,
  };
}

describe("weightedModalityAccuracy", () => {
  it("weights by guess count within each trio modality", () => {
    const rows = [
      makeRow({ guessAccuracy: 1, guessCount: 10 }),
      makeRow({ ideophoneId: 2, guessAccuracy: 0.5, guessCount: 30 }),
      makeRow({ ideophoneId: 3, modality: "VISUAL", guessAccuracy: 0.8, guessCount: 5 }),
    ];
    const agg = weightedModalityAccuracy(rows);
    expect(agg.AUDITORY.accuracy).toBeCloseTo((1 * 10 + 0.5 * 30) / 40, 10);
    expect(agg.AUDITORY.guessCount).toBe(40);
    expect(agg.VISUAL.accuracy).toBeCloseTo(0.8, 10);
    expect(agg.INTEROCEPTIVE.accuracy).toBeNull();
    expect(agg.INTEROCEPTIVE.guessCount).toBe(0);
  });

  it("skips null accuracies and never yields NaN or 0 for no data", () => {
    const rows = [
      makeRow({ guessAccuracy: null, guessCount: 0, ratingCount: 3 }),
    ];
    const agg = weightedModalityAccuracy(rows);
    expect(agg.AUDITORY.accuracy).toBeNull();
    expect(agg.AUDITORY.accuracy).not.toBeNaN();
  });

  it("excludes PRACTICE and unknown modalities from the trio rows", () => {
    const rows = [
      makeRow({ modality: "PRACTICE", guessAccuracy: 1, guessCount: 100 }),
      makeRow({ ideophoneId: 2, modality: "TACTILE", guessAccuracy: 1, guessCount: 100 }),
      makeRow({ ideophoneId: 3, modality: undefined, guessAccuracy: 1, guessCount: 100 }),
      makeRow({ ideophoneId: 4, guessAccuracy: 0.5, guessCount: 10 }),
    ];
    const agg = weightedModalityAccuracy(rows);
    expect(agg.AUDITORY.accuracy).toBeCloseTo(0.5, 10);
    expect(agg.AUDITORY.guessCount).toBe(10);
  });
});

describe("recordTotals", () => {
  it("sums every row regardless of modality", () => {
    const rows = [
      makeRow({ guessCount: 7, ratingCount: 2 }),
      makeRow({ ideophoneId: 2, modality: "PRACTICE", guessCount: 3, ratingCount: 1 }),
    ];
    expect(recordTotals(rows)).toEqual({ guesses: 10, ratings: 3 });
    expect(recordTotals([])).toEqual({ guesses: 0, ratings: 0 });
  });
});

describe("playerMeanRating", () => {
  it("averages ratings and returns null for none", () => {
    const rating = (r: number): RatingResponse => ({
      id: r,
      ideophoneId: r,
      rating: r,
      ratedAt: "2026-07-05T00:00:00Z",
    });
    expect(playerMeanRating([rating(3), rating(6)])).toBeCloseTo(4.5, 10);
    expect(playerMeanRating([])).toBeNull();
  });
});

describe("zContext / zScore", () => {
  it("standardizes with sample sd", () => {
    const ctx = zContext([2, 4, 6])!;
    expect(ctx.mean).toBeCloseTo(4, 10);
    expect(ctx.sd).toBeCloseTo(2, 10);
    expect(zScore(6, ctx)).toBeCloseTo(1, 10);
  });

  it("refuses fewer than 3 values or zero spread", () => {
    expect(zContext([])).toBeNull();
    expect(zContext([4, 5])).toBeNull();
    expect(zContext([5, 5, 5, 5])).toBeNull();
  });
});

describe("buildArenaScatter", () => {
  const pool = ["gosogoso", "katakata", "kirakira", "dokidoki"];

  it("plots only words with both measures and standardizes their ratings", () => {
    const rows = [
      makeRow({ meanRating: 3 }),
      makeRow({ ideophoneId: 2, romaji: "katakata", meanRating: 5 }),
      makeRow({ ideophoneId: 3, romaji: "kirakira", meanRating: 7 }),
      // Awaiting first rating - excluded from the cloud, counted honestly.
      makeRow({ ideophoneId: 4, romaji: "dokidoki", meanRating: null, ratingCount: 0 }),
    ];
    const result = buildArenaScatter(rows, pool);
    expect(result.points).toHaveLength(3);
    expect(result.awaitingRating).toBe(1);
    expect(result.awaitingGuess).toBe(0);
    expect(result.neverPlayed).toBe(0);
    expect(result.suppressed).toBe(false);
    const zs = result.points.map((p) => p.z);
    expect(zs.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
    expect(result.points[0].wilson).not.toBeNull();
  });

  it("suppresses the layer below 3 eligible words", () => {
    const rows = [makeRow(), makeRow({ ideophoneId: 2, romaji: "katakata" })];
    const result = buildArenaScatter(rows, pool);
    expect(result.points).toHaveLength(0);
    expect(result.suppressed).toBe(true);
    expect(result.eligibleCount).toBe(2);
    expect(result.ratingZContext).toBeNull();
  });

  it("counts never-played pool words by romaji, not by row arithmetic", () => {
    // The local record can carry non-pool rows (test artifacts) - pool math
    // must match on romaji, never compute pool − rows.length.
    const rows = [
      makeRow(),
      makeRow({ ideophoneId: 99, romaji: "not-a-pool-word" }),
    ];
    const result = buildArenaScatter(rows, pool);
    expect(result.neverPlayed).toBe(3); // katakata, kirakira, dokidoki
  });

  it("falls back to #id labels when romaji is missing", () => {
    const rows = [
      makeRow({ romaji: undefined, gloss: undefined }),
      makeRow({ ideophoneId: 2, romaji: "katakata", meanRating: 2 }),
      makeRow({ ideophoneId: 3, romaji: "kirakira", meanRating: 6 }),
    ];
    const result = buildArenaScatter(rows, pool);
    const fallback = result.points.find((p) => p.ideophoneId === 1)!;
    expect(fallback.label).toBe("#1");
    expect(fallback.gloss).toBeNull();
  });

  it("handles the empty record without NaN (deploy-day reality)", () => {
    const result = buildArenaScatter([], pool);
    expect(result.points).toEqual([]);
    expect(result.suppressed).toBe(false);
    expect(result.awaitingRating).toBe(0);
    expect(result.neverPlayed).toBe(4);
  });
});
