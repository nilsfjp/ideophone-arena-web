import { describe, expect, it } from "vitest";
import { formatCI, formatPercent, formatPercentPrecise, formatRating7, formatZ } from "./format";
import { dumbbellDomain, makeLinearScale } from "./scales";

describe("makeLinearScale", () => {
  it("maps domain to range linearly", () => {
    const scale = makeLinearScale([0, 1], [16, 716]);
    expect(scale(0)).toBe(16);
    expect(scale(0.5)).toBe(366);
    expect(scale(1)).toBe(716);
  });
});

describe("dumbbellDomain", () => {
  it("stays at [0.25, 1] when data sits in the band", () => {
    expect(dumbbellDomain([0.597, 0.686])).toEqual([0.25, 1]);
    expect(dumbbellDomain([])).toEqual([0.25, 1]);
  });

  it("extends down in 0.05 steps for a low outlier instead of clipping", () => {
    expect(dumbbellDomain([0.18, 0.686])).toEqual([0.15, 1]);
    expect(dumbbellDomain([0.02])).toEqual([0, 1]);
  });
});

describe("format", () => {
  it("formats deterministically without locale APIs", () => {
    expect(formatPercent(0.686)).toBe("69%");
    expect(formatPercentPrecise(0.686)).toBe("68.6%");
    expect(formatPercentPrecise(0.5)).toBe("50%");
    expect(formatCI({ lo: 0.4902, hi: 0.9433 })).toBe("49–94%");
    expect(formatRating7(4.42)).toBe("4.4 / 7");
    expect(formatZ(1.83)).toBe("+1.8");
    expect(formatZ(-0.44)).toBe("−0.4");
    expect(formatZ(0)).toBe("0.0");
  });
});
