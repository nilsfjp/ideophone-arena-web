import { describe, expect, it } from "vitest";
import { jitterFor, mulberry32, xmur3 } from "./jitter";

describe("mulberry32 / xmur3", () => {
  it("reproduces a fixed sequence for a fixed seed", () => {
    const a = mulberry32(xmur3("seed")());
    const b = mulberry32(xmur3("seed")());
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("stays in [0, 1) and never NaN", () => {
    const gen = mulberry32(xmur3("AUDITORY:4:0")());
    for (let i = 0; i < 100; i += 1) {
      const v = gen();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it("different seeds diverge", () => {
    expect(mulberry32(xmur3("a")())()).not.toBe(mulberry32(xmur3("b")())());
  });
});

describe("jitterFor", () => {
  it("is idempotent for the same (modality, value, index)", () => {
    expect(jitterFor("AUDITORY", 3, 0)).toBe(jitterFor("AUDITORY", 3, 0));
  });

  it("stays in [-1, 1) and never NaN", () => {
    for (let i = 0; i < 50; i += 1) {
      const v = jitterFor("VISUAL", (i % 7) + 1, i);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it("spreads: distinct keys give distinct jitter", () => {
    const values = new Set([
      jitterFor("AUDITORY", 4, 0),
      jitterFor("AUDITORY", 4, 1),
      jitterFor("AUDITORY", 5, 0),
      jitterFor("VISUAL", 4, 0),
    ]);
    expect(values.size).toBe(4);
  });
});
