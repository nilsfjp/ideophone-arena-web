import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DivergenceEntry } from "../../api/types";
import ModalityDumbbell from "./ModalityDumbbell";

function makeRow(overrides: Partial<DivergenceEntry> = {}): DivergenceEntry {
  return {
    ideophoneId: 1,
    romaji: "gosogoso",
    gloss: "with a rustling sound",
    modality: "AUDITORY",
    guessAccuracy: 0.5,
    guessCount: 40,
    meanRating: null,
    ratingCount: 0,
    ...overrides,
  };
}

function render(liveRows: DivergenceEntry[] | null) {
  return renderToStaticMarkup(<ModalityDumbbell liveRows={liveRows} />);
}

function count(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

describe("ModalityDumbbell", () => {
  it("renders three direct-labeled rows with the chance hairline", () => {
    const markup = render([]);
    expect(markup).toContain('class="observatory-panel observatory-panel--dumbbell"');
    expect(markup).toContain("Sound · auditory");
    expect(markup).toContain("Sight · visual");
    expect(markup).toContain("Inner states · interoceptive");
    expect(markup).toContain("Chance · 50%");
  });

  it("prints the thesis values beside the ink dots", () => {
    const markup = render([]);
    expect(markup).toContain("68.6%");
    expect(markup).toContain("64.2%");
    expect(markup).toContain("59.7%");
  });

  it("renders live dots solid at N ≥ 30 and hollow below", () => {
    const solid = render([makeRow({ guessCount: 30 })]);
    expect(count(solid, "dumbbell-live--hollow")).toBe(0);
    expect(solid).toContain("N = 30");

    const hollow = render([makeRow({ guessCount: 12 })]);
    expect(hollow).toContain("dumbbell-live--hollow");
    expect(hollow).toContain("N = 12");
    expect(hollow).toContain("Hollow dots mark modalities still under 30");
  });

  it("renders no live dot for a modality without data — N = 0, no NaN", () => {
    const markup = render([]);
    expect(count(markup, 'class="dumbbell-live"')).toBe(0);
    expect(count(markup, "N = 0")).toBe(3);
    expect(markup).not.toContain("NaN");
  });

  it("weights the live mean by guess count within the modality", () => {
    const markup = render([
      makeRow({ guessAccuracy: 1, guessCount: 10 }),
      makeRow({ ideophoneId: 2, guessAccuracy: 0.5, guessCount: 30 }),
    ]);
    expect(markup).toContain("62.5%"); // (1·10 + 0.5·30) / 40
    expect(markup).toContain("N = 40");
  });

  it("discloses the live/thesis coverage difference and ships a table twin", () => {
    const markup = render([]);
    expect(markup).toContain("practice rounds included");
    expect(markup).toContain("View as table");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('id="observatory-dumbbell-table"');
    expect(markup).toContain("Thesis accuracy");
  });
});
