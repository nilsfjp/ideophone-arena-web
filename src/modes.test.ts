import { describe, expect, it } from "vitest";
import { MODES } from "./modes";

describe("mode registry", () => {
  it("has three modes with unique ids", () => {
    expect(MODES).toHaveLength(3);
    expect(new Set(MODES.map((mode) => mode.id)).size).toBe(3);
  });

  it("Meaning Match, Rating Lab, and the Perception Ladder are available", () => {
    const available = MODES.filter((mode) => mode.status === "available");
    expect(available.map((mode) => mode.id)).toEqual([
      "choosing",
      "rating",
      "ladder",
    ]);
  });

  // Player-facing copy must not leak backend enums or difficulty dev-speak.
  it("keeps player-facing wording free of dev-speak", () => {
    for (const mode of MODES) {
      const copy = `${mode.title} ${mode.description}`;
      expect(copy).not.toMatch(/CONDITION_/);
      expect(copy).not.toMatch(/difficulty/i);
    }
  });
});
