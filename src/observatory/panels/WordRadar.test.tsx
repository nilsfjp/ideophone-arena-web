import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NormsWord } from "../../data/observatory";
import WordRadar from "./WordRadar";

const FIXTURE_WORDS: NormsWord[] = [
  {
    word: "kirakira",
    axes: [3.2, 4.7, 1.0, 0.6, 0.6, 1.3],
    arena: { romaji: "kirakira", gloss: "sparkling, glittering" },
  },
  {
    word: "shimeru",
    axes: [1.3, 2.8, 1.0, 1.1, 0.8, 1.6],
    arena: null,
  },
];

function count(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

describe("WordRadar defaults", () => {
  it("renders the pipeline's default pair as two overlaid polygons", () => {
    const markup = renderToStaticMarkup(<WordRadar />);
    expect(markup).toContain('class="observatory-panel observatory-panel--radar"');
    expect(markup).toContain("radar-polygon--a");
    expect(markup).toContain("radar-polygon--b");
    expect(markup).toContain("kirakira");
    expect(markup).toContain("sukkiri");
  });

  it("draws six labeled axes and five rings", () => {
    const markup = renderToStaticMarkup(<WordRadar />);
    for (const axis of [
      "Auditory",
      "Visual",
      "Haptic",
      "Gustatory",
      "Olfactory",
      "Interoceptive",
    ]) {
      expect(markup).toContain(axis);
    }
    expect(count(markup, 'class="radar-ring"')).toBe(5);
  });

  it("badges arena words in the selection chips (both defaults match)", () => {
    const markup = renderToStaticMarkup(<WordRadar />);
    expect(count(markup, ">Arena</span>")).toBeGreaterThanOrEqual(2);
  });

  it("offers two labeled search pickers, native controls only", () => {
    const markup = renderToStaticMarkup(<WordRadar />);
    expect(markup).toContain('id="radar-picker-a"');
    expect(markup).toContain('id="radar-picker-b"');
    expect(markup).toContain("Word A");
    expect(markup).toContain("Word B");
    // Always-mounted live regions so result counts are announced.
    expect(markup.split('role="status"').length - 1).toBe(2);
  });

  it("ships the six-row table twin for the current pair", () => {
    const markup = renderToStaticMarkup(<WordRadar />);
    expect(markup).toContain('id="observatory-radar-table"');
    expect(markup).toContain("kirakira versus sukkiri");
  });
});

describe("WordRadar fixtures", () => {
  it("shows no badge for a word outside the arena pool", () => {
    const markup = renderToStaticMarkup(
      <WordRadar
        words={FIXTURE_WORDS}
        defaultPair={["kirakira", "shimeru"] as const}
      />,
    );
    // One chip carries the badge (kirakira), the other does not (shimeru).
    expect(count(markup, ">Arena</span>")).toBe(1);
    expect(markup).toContain("sparkling, glittering");
    expect(markup).toContain("shimeru");
  });
});
