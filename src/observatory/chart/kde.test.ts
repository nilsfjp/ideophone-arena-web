import { describe, expect, it } from "vitest";
import { epanechnikov, kdeCurve, silvermanBandwidth } from "./kde";

describe("epanechnikov", () => {
  it("peaks at 0.75 at the origin and vanishes outside |u| = 1", () => {
    expect(epanechnikov(0)).toBe(0.75);
    expect(epanechnikov(1)).toBe(0);
    expect(epanechnikov(-1)).toBe(0);
    expect(epanechnikov(2)).toBe(0);
    expect(epanechnikov(0.5)).toBeCloseTo(0.5625, 10);
  });
});

describe("silvermanBandwidth", () => {
  it("floors at 4% of the span for n = 1 and zero-variance input", () => {
    expect(silvermanBandwidth([0.5], 1)).toBeCloseTo(0.04, 10);
    expect(silvermanBandwidth([0.5, 0.5, 0.5, 0.5, 0.5], 1)).toBeCloseTo(
      0.04,
      10,
    );
  });

  it("grows with spread and shrinks with n", () => {
    const tight = silvermanBandwidth([0.4, 0.45, 0.5, 0.55, 0.6], 1);
    const wide = silvermanBandwidth([0.1, 0.3, 0.5, 0.7, 0.9], 1);
    expect(wide).toBeGreaterThan(tight);
  });
});

describe("kdeCurve", () => {
  it("returns an empty curve for empty input", () => {
    expect(kdeCurve([], { min: 0, max: 1 })).toEqual([]);
  });

  it("produces a finite, peak-normalized curve for a single value", () => {
    const curve = kdeCurve([0.5], { min: 0, max: 1 });
    expect(curve).toHaveLength(65); // steps + 1
    for (const p of curve) {
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    const peak = curve.reduce((best, p) => (p.y > best.y ? p : best));
    expect(peak.y).toBe(1);
    expect(peak.x).toBeCloseTo(0.5, 1);
  });

  it("survives zero-variance input without NaN", () => {
    const curve = kdeCurve([3, 3, 3, 3], { min: 1, max: 7 });
    expect(curve.some((p) => Number.isNaN(p.y))).toBe(false);
    expect(Math.max(...curve.map((p) => p.y))).toBe(1);
  });

  it("is symmetric for symmetric input", () => {
    const curve = kdeCurve([0.3, 0.7], { min: 0, max: 1, steps: 10 });
    for (let i = 0; i <= 10; i += 1) {
      expect(curve[i].y).toBeCloseTo(curve[10 - i].y, 10);
    }
  });

  it("respects an explicit bandwidth and the steps option", () => {
    const curve = kdeCurve([0.5], { min: 0, max: 1, steps: 4, bandwidth: 0.1 });
    expect(curve).toHaveLength(5);
    expect(curve.map((p) => p.x)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    // With bandwidth 0.1, points 0.25 away contribute nothing.
    expect(curve[0].y).toBe(0);
    expect(curve[2].y).toBe(1);
  });
});
