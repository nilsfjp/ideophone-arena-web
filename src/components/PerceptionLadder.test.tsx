import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LadderFloorResponse } from "../api/types";
import { deriveFloorRows } from "../ladderText";
import { LadderFloorStack } from "./PerceptionLadder";

function floor(
  modality: string,
  overrides: Partial<LadderFloorResponse> = {},
): LadderFloorResponse {
  return {
    modality,
    pairCount: 10,
    finalRungPairCode: "x1",
    cleared: false,
    bestCorrect: null,
    bestAnswered: null,
    pairs: [],
    ...overrides,
  };
}

// The live backend serves four floors including a real HAPTIC (Touch) floor.
const FOUR: LadderFloorResponse[] = [
  floor("AUDITORY"),
  floor("VISUAL"),
  floor("HAPTIC", { pairCount: 4 }),
  floor("INTEROCEPTIVE"),
];

// A three-floor payload (no HAPTIC) exercises the client-side teaser path — the
// same rendering code, zero code delta (V8 graceful degradation).
const THREE: LadderFloorResponse[] = [
  floor("AUDITORY"),
  floor("VISUAL"),
  floor("INTEROCEPTIVE"),
];

describe("deriveFloorRows", () => {
  it("renders three real floors plus the Touch teaser at position 3 when the API omits HAPTIC", () => {
    const rows = deriveFloorRows(THREE);
    expect(rows).toHaveLength(4);
    expect(rows.filter((row) => !row.isTeaser)).toHaveLength(3);

    const teaser = rows.find((row) => row.isTeaser);
    expect(teaser).toBeDefined();
    // Hierarchy position 3: spliced in before Inner states (V8).
    expect(rows.indexOf(teaser!)).toBe(2);
    expect(teaser!.ordinal).toBeNull();
    expect(teaser!.name).toBe("Touch");
    expect(teaser!.pillText).toBe("In preparation");
    expect(teaser!.interactive).toBe(false);

    // Inner states keeps its API ordinal (3) — the teaser consumes no ordinal.
    const inner = rows.find((row) => row.modality === "INTEROCEPTIVE");
    expect(inner!.ordinal).toBe(3);
  });

  it("renders four real floors and NO teaser once the API serves HAPTIC (teaser removed)", () => {
    const rows = deriveFloorRows(FOUR);
    expect(rows).toHaveLength(4);
    // Teaser-removal flag.
    expect(rows.some((row) => row.isTeaser)).toBe(false);
    expect(rows.map((row) => row.ordinal)).toEqual([1, 2, 3, 4]);

    const touch = rows.find((row) => row.modality === "HAPTIC");
    expect(touch!.name).toBe("Touch");
    expect(touch!.ordinal).toBe(3);
    expect(touch!.isTeaser).toBe(false);
  });

  it("derives ordinals and names from array position (V3)", () => {
    const rows = deriveFloorRows(FOUR).filter((row) => !row.isTeaser);
    expect(rows.map((row) => `${row.ordinal}:${row.name}`)).toEqual([
      "1:Sound",
      "2:Sight",
      "3:Touch",
      "4:Inner states",
    ]);
  });

  it("derives sequential-unlock pill states (cleared / up next / after floor n)", () => {
    const rows = deriveFloorRows([
      floor("AUDITORY", { cleared: true, bestCorrect: 8, bestAnswered: 10 }),
      floor("VISUAL"),
      floor("HAPTIC", { pairCount: 4 }),
      floor("INTEROCEPTIVE"),
    ]);
    expect(rows[0].pillText).toBe("Cleared · 8/10");
    expect(rows[0].pillVariant).toBe("cleared");
    expect(rows[0].interactive).toBe(true);
    expect(rows[1].pillText).toBe("Up next");
    expect(rows[1].pillVariant).toBe("current");
    expect(rows[1].interactive).toBe(true);
    expect(rows[2].pillText).toBe("After floor 2");
    expect(rows[2].interactive).toBe(false);
    expect(rows[3].pillText).toBe("After floor 3");
  });

  it("shows the thesis mean in a cleared floor's stats, and none for Touch", () => {
    const [sound] = deriveFloorRows([
      floor("AUDITORY", { cleared: true, bestCorrect: 7, bestAnswered: 10 }),
    ]);
    expect(sound.statsText).toBe("Best · 7/10 · thesis mean 6.9");

    const [touch] = deriveFloorRows([
      floor("HAPTIC", {
        pairCount: 4,
        cleared: true,
        bestCorrect: 3,
        bestAnswered: 4,
      }),
    ]);
    expect(touch.statsText).toBe("Best · 3/4");
  });
});

describe("LadderFloorStack", () => {
  it("keeps the semantic hook first-position and pairs every haptic element with its text label", () => {
    const markup = renderToStaticMarkup(
      <LadderFloorStack rows={deriveFloorRows(FOUR)} onSelectFloor={() => {}} />,
    );
    // Stable-hook contract (§16/§5): .ladder-floor is the first class.
    expect(markup).toContain('class="ladder-floor floor-aud"');
    expect(markup).toContain('class="ladder-floor floor-hap"');
    // §4.4: the haptic-colored card always carries its text label.
    expect(markup).toContain("Floor 3 · Touch");
  });

  it("renders locked floors and the teaser as non-interactive articles", () => {
    const markup = renderToStaticMarkup(
      <LadderFloorStack rows={deriveFloorRows(THREE)} onSelectFloor={() => {}} />,
    );
    expect(markup).toContain("<article");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("In preparation");
    // The teaser is present but the real HAPTIC ordinal label is not.
    expect(markup).not.toContain("Floor 3 · Touch");
  });
});
