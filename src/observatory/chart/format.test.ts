import { describe, expect, it } from "vitest";
import { formatFixed2 } from "./format";

describe("formatFixed2", () => {
  it("formats to two decimals", () => {
    expect(formatFixed2(1.42)).toBe("1.42");
    expect(formatFixed2(1.4)).toBe("1.40");
  });

  it("uses a U+2212 minus for negatives", () => {
    expect(formatFixed2(-0.03)).toBe("−0.03");
  });

  it("has no signed zero", () => {
    expect(formatFixed2(0)).toBe("0.00");
    expect(formatFixed2(-0.0001)).toBe("0.00");
  });
});
