import { describe, expect, it } from "vitest";
import { MODES } from "./modes";

describe("mode registry", () => {
  it("gives every registered mode a unique id", () => {
    expect(new Set(MODES.map((mode) => mode.id)).size).toBe(MODES.length);
  });

  // The registry lists shipped modes only — the six-mode shell scales from this
  // data, not from stubs, so a new entry here means a new build landed.
  it("Meaning Match, Rating Lab, Perception Ladder and Word Mint are available", () => {
    const available = MODES.filter((mode) => mode.status === "available");
    expect(available.map((mode) => mode.id)).toEqual([
      "choosing",
      "rating",
      "ladder",
      "production",
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
