import { describe, expect, it } from "vitest";
import { wilsonFromProportion, wilsonInterval } from "./wilson";

describe("wilsonInterval", () => {
  it("matches the textbook value for 8/10 at 95%", () => {
    const ci = wilsonInterval(8, 10);
    expect(ci).not.toBeNull();
    expect(ci!.lo).toBeCloseTo(0.4902, 3);
    expect(ci!.hi).toBeCloseTo(0.9433, 3);
  });

  it("clamps to exactly 0 and 1 at the extremes", () => {
    const zero = wilsonInterval(0, 5);
    expect(zero!.lo).toBe(0);
    expect(zero!.hi).toBeCloseTo(0.4345, 3);
    const full = wilsonInterval(5, 5);
    expect(full!.hi).toBe(1);
    expect(full!.lo).toBeCloseTo(0.5655, 3);
  });

  it("returns null for n = 0 (no data is not an interval)", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
  });

  it("narrows as n grows", () => {
    const small = wilsonInterval(7, 10)!;
    const large = wilsonInterval(70, 100)!;
    expect(large.hi - large.lo).toBeLessThan(small.hi - small.lo);
  });
});

describe("wilsonFromProportion", () => {
  it("reconstructs successes from the endpoint's proportion", () => {
    // 34/36 = 0.9444…; the endpoint reports the proportion.
    const fromCounts = wilsonInterval(34, 36)!;
    const fromProportion = wilsonFromProportion(0.9444, 36)!;
    expect(fromProportion.lo).toBeCloseTo(fromCounts.lo, 6);
    expect(fromProportion.hi).toBeCloseTo(fromCounts.hi, 6);
  });
});
