import { describe, expect, it } from "vitest";
import type { RatingDistributionsResponse } from "../../api/types";
import {
  countsByModality,
  countsForModality,
  dotSample,
  DOT_CAP,
  expandCounts,
  quartilesFromCounts,
} from "./rainclouds";

const dist: RatingDistributionsResponse = {
  distributions: [
    { modality: "AUDITORY", ratingValue: 1, count: 0 },
    { modality: "AUDITORY", ratingValue: 2, count: 3 },
    { modality: "AUDITORY", ratingValue: 3, count: 5 },
    { modality: "AUDITORY", ratingValue: 4, count: 4 },
    { modality: "AUDITORY", ratingValue: 5, count: 2 },
    { modality: "AUDITORY", ratingValue: 6, count: 1 },
    { modality: "AUDITORY", ratingValue: 7, count: 0 },
    { modality: "VISUAL", ratingValue: 1, count: 1 },
    // A non-trio modality the endpoint may carry — must be ignored by the trio grouping.
    { modality: "GUSTATORY", ratingValue: 4, count: 9 },
  ],
  byModalityN: { AUDITORY: 15, VISUAL: 1, GUSTATORY: 9 },
};

describe("countsForModality / countsByModality", () => {
  it("reads a present modality into a length-7 counts array", () => {
    expect(countsForModality(dist, "AUDITORY")).toEqual([0, 3, 5, 4, 2, 1, 0]);
  });

  it("returns null for a modality the endpoint omitted", () => {
    expect(countsForModality(dist, "INTEROCEPTIVE")).toBeNull();
  });

  it("groups only the trio modalities the response carries", () => {
    const map = countsByModality(dist);
    expect([...map.keys()].sort()).toEqual(["AUDITORY", "VISUAL"]);
    expect(map.has("INTEROCEPTIVE")).toBe(false);
  });
});

describe("expandCounts", () => {
  it("repeats each value by its count, ascending", () => {
    expect(expandCounts([0, 0, 3, 0, 0, 0, 0])).toEqual([3, 3, 3]);
  });

  it("empty distribution → empty array", () => {
    expect(expandCounts([0, 0, 0, 0, 0, 0, 0])).toEqual([]);
  });
});

describe("quartilesFromCounts", () => {
  it("matches type-7 quantiles on a uniform 1–7 spread", () => {
    const q = quartilesFromCounts([1, 1, 1, 1, 1, 1, 1]);
    expect(q).toEqual({ q1: 2.5, median: 4, q3: 5.5, min: 1, max: 7 });
  });

  it("collapses onto a single distinct value without NaN", () => {
    const q = quartilesFromCounts([0, 0, 0, 5, 0, 0, 0]);
    expect(q).toEqual({ q1: 4, median: 4, q3: 4, min: 4, max: 4 });
    expect(Number.isNaN(q!.median)).toBe(false);
  });

  it("empty tier → null (no box)", () => {
    expect(quartilesFromCounts([0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });
});

describe("dotSample", () => {
  it("shows every rating under the cap", () => {
    const s = dotSample("AUDITORY", [0, 3, 5, 4, 2, 1, 0]);
    expect(s.total).toBe(15);
    expect(s.shown).toBe(15);
    expect(s.dots.every((d) => d.value >= 1 && d.value <= 7)).toBe(true);
  });

  it("subsamples proportionally above the cap, preserving presence", () => {
    const counts = [700, 0, 0, 0, 0, 0, 300];
    const s = dotSample("VISUAL", counts, 80);
    expect(s.total).toBe(1000);
    expect(s.shown).toBeLessThan(s.total);
    // Both present values survive the thinning.
    expect(s.dots.some((d) => d.value === 1)).toBe(true);
    expect(s.dots.some((d) => d.value === 7)).toBe(true);
    // Value 1 (70%) gets more dots than value 7 (30%).
    const ones = s.dots.filter((d) => d.value === 1).length;
    const sevens = s.dots.filter((d) => d.value === 7).length;
    expect(ones).toBeGreaterThan(sevens);
  });

  it("is deterministic", () => {
    const a = dotSample("INTEROCEPTIVE", [1, 2, 3, 4, 5, 6, 7]);
    const b = dotSample("INTEROCEPTIVE", [1, 2, 3, 4, 5, 6, 7]);
    expect(a).toEqual(b);
  });

  it("empty tier → no dots, no NaN", () => {
    const s = dotSample("AUDITORY", [0, 0, 0, 0, 0, 0, 0]);
    expect(s).toEqual({ dots: [], shown: 0, total: 0 });
  });

  it("DOT_CAP is a positive integer", () => {
    expect(Number.isInteger(DOT_CAP)).toBe(true);
    expect(DOT_CAP).toBeGreaterThan(0);
  });
});
