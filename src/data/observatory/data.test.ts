import { describe, expect, it } from "vitest";
import { arenaPool, mclean, norms, thesisPairs, thesisRatings } from ".";
import type { TrioModality } from ".";

// Integrity guard over the COMMITTED dataset JSON (SPEC-stats-dashboard §4.3).
// The pipeline validates before writing; this test re-validates what is
// actually checked in, so a hand-edited or half-committed dataset fails CI.

describe("thesis-pairs.json", () => {
  it("carries 30 pairs with sane per-pair stats", () => {
    expect(thesisPairs.pairs).toHaveLength(30);
    for (const p of thesisPairs.pairs) {
      expect(p.romaji.length).toBeGreaterThan(0);
      expect(p.nCorrect).toBeLessThanOrEqual(p.n);
      expect(p.n).toBeGreaterThan(0);
      expect(p.accuracy).toBeCloseTo(p.nCorrect / p.n, 3);
      expect(p.meanRating).toBeGreaterThanOrEqual(1);
      expect(p.meanRating).toBeLessThanOrEqual(7);
      expect(Number.isInteger(p.medianRtMs)).toBe(true);
    }
  });

  it("reproduces the published per-modality accuracies, ordered aud > vis > int", () => {
    const { auditory, visual, interoceptive } = thesisPairs.byModality;
    expect(auditory.accuracy).toBeCloseTo(0.686, 3);
    expect(visual.accuracy).toBeCloseTo(0.642, 3);
    expect(interoceptive.accuracy).toBeCloseTo(0.597, 3);
    expect(auditory.accuracy).toBeGreaterThan(visual.accuracy);
    expect(visual.accuracy).toBeGreaterThan(interoceptive.accuracy);
    expect(auditory.pairs + visual.pairs + interoceptive.pairs).toBe(30);
  });

  it("standardizes ratings within the layer (z mean ≈ 0, sd recorded)", () => {
    const zs = thesisPairs.pairs.map((p) => p.meanRatingZ);
    const meanZ = zs.reduce((a, b) => a + b, 0) / zs.length;
    expect(Math.abs(meanZ)).toBeLessThan(0.01);
    expect(thesisPairs.meta.ratingSd).toBeGreaterThan(0);
    // The z column reconstructs from meta mean/sd - the crosshair math relies on it.
    const p0 = thesisPairs.pairs[0];
    expect(p0.meanRatingZ).toBeCloseTo(
      (p0.meanRating - thesisPairs.meta.ratingMean) / thesisPairs.meta.ratingSd,
      2,
    );
  });
});

describe("mclean.json", () => {
  it("carries 304 items split 101 ideophone / 203 prosaic", () => {
    expect(mclean.items).toHaveLength(304);
    const ideophones = mclean.items.filter((i) => i.stratum === "ideophone");
    expect(ideophones).toHaveLength(101);
    expect(mclean.items.length - ideophones.length).toBe(203);
  });

  it("has both measures on every item, scores in [0,1], finite z", () => {
    for (const item of mclean.items) {
      expect(item.guessScore).toBeGreaterThanOrEqual(0);
      expect(item.guessScore).toBeLessThanOrEqual(1);
      expect(item.ratingScore).toBeGreaterThanOrEqual(0);
      expect(item.ratingScore).toBeLessThanOrEqual(1);
      expect(Number.isFinite(item.ratingZ)).toBe(true);
      expect(Number.isFinite(item.guessZ)).toBe(true);
      expect(item.word.length).toBeGreaterThan(0);
    }
  });
});

describe("norms.json", () => {
  it("carries 510 unique words with six axes in [0,5]", () => {
    expect(norms.words).toHaveLength(510);
    expect(new Set(norms.words.map((w) => w.word)).size).toBe(510);
    for (const w of norms.words) {
      expect(w.axes).toHaveLength(6);
      for (const v of w.axes) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it("pins the arena∩norms intersection and the default pair inside it", () => {
    const matched = norms.words.filter((w) => w.arena !== null);
    expect(matched).toHaveLength(norms.meta.arenaMatchCount);
    expect(norms.meta.arenaMatchCount).toBe(17);
    const matchedWords = new Set(matched.map((w) => w.word));
    const [a, b] = norms.meta.defaultPair;
    expect(a).not.toBe(b);
    expect(matchedWords.has(a)).toBe(true);
    expect(matchedWords.has(b)).toBe(true);
  });
});

describe("arena-pool.json", () => {
  it("carries the 68-word pool with unique romaji and non-empty glosses", () => {
    expect(arenaPool.words).toHaveLength(68);
    expect(new Set(arenaPool.words.map((w) => w.romaji)).size).toBe(68);
    for (const w of arenaPool.words) {
      expect(w.gloss.length).toBeGreaterThan(0);
    }
  });
});

describe("thesis-ratings.json", () => {
  const TRIO: TrioModality[] = ["auditory", "visual", "interoceptive"];

  it("carries the trio, seven non-negative integer counts summing to n=360, 1080 total", () => {
    expect(Object.keys(thesisRatings.byModality).sort()).toEqual(
      [...TRIO].sort(),
    );
    let total = 0;
    for (const m of TRIO) {
      const tier = thesisRatings.byModality[m];
      expect(tier.counts).toHaveLength(7);
      for (const c of tier.counts) {
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(0);
      }
      const sum = tier.counts.reduce((a, c) => a + c, 0);
      expect(sum).toBe(tier.n);
      expect(tier.n).toBe(360);
      total += tier.n;
    }
    expect(total).toBe(1080);
    expect(thesisRatings.meta.totalRatings).toBe(1080);
  });
});
