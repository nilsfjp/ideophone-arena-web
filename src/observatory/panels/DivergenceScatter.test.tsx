import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DivergenceEntry } from "../../api/types";
import type { SessionMarker } from "../Observatory";
import DivergenceScatter from "./DivergenceScatter";

function makeRow(overrides: Partial<DivergenceEntry> = {}): DivergenceEntry {
  return {
    ideophoneId: 1,
    romaji: "gosogoso",
    gloss: "with a rustling sound",
    modality: "AUDITORY",
    guessAccuracy: 0.6,
    guessCount: 10,
    meanRating: 4.5,
    ratingCount: 5,
    ...overrides,
  };
}

// Three eligible words → the arena layer clears its z-standardization gate.
const THREE_ELIGIBLE = [
  makeRow({ meanRating: 3 }),
  makeRow({ ideophoneId: 2, romaji: "katakata", gloss: "clattering", meanRating: 5 }),
  makeRow({ ideophoneId: 3, romaji: "kirakira", gloss: "sparkling", meanRating: 6.5 }),
];

function render(
  liveRows: DivergenceEntry[] | null,
  session: SessionMarker | null = null,
  kanaByRomaji?: ReadonlyMap<string, string>,
) {
  return renderToStaticMarkup(
    <DivergenceScatter
      liveRows={liveRows}
      session={session}
      kanaByRomaji={kanaByRomaji}
    />,
  );
}

describe("DivergenceScatter layers", () => {
  it("encodes the McLean strata as shape + fill, never vermillion", () => {
    const markup = render([]);
    expect(markup).toContain('class="scatter-mark--mclean-ideophone"'); // circles
    expect(markup).toContain('class="scatter-mark--mclean-prosaic"'); // rects
    expect(markup).toContain("■ Prosaic · McLean 2023");
  });

  it("renders focusable thesis and arena marks with full aria-labels", () => {
    const markup = render(THREE_ELIGIBLE);
    expect(markup).toMatch(
      /class="scatter-mark--thesis"[^>]*tabindex="0"/,
    );
    const arenaMark = markup.match(/<circle class="scatter-mark--arena"[^>]*>/);
    expect(arenaMark).not.toBeNull();
    expect(arenaMark![0]).toContain('tabindex="0"');
    expect(arenaMark![0]).toContain("gosogoso");
    expect(arenaMark![0]).toContain("CI");
    expect(arenaMark![0]).toContain("3.0 / 7");
  });

  it("suppresses the arena layer below three rated words, with the honest note", () => {
    const markup = render(THREE_ELIGIBLE.slice(0, 2));
    expect(markup).not.toContain('class="scatter-mark--arena"');
    expect(markup).toContain("once three words carry both measures");
  });

  it("excludes half-measured words from the cloud and counts them in the notes", () => {
    const markup = render([
      ...THREE_ELIGIBLE,
      makeRow({ ideophoneId: 4, romaji: "dokidoki", meanRating: null, ratingCount: 0 }),
      makeRow({ ideophoneId: 5, romaji: "dosari", meanRating: null, ratingCount: 0 }),
      makeRow({ ideophoneId: 6, romaji: "hoQ", guessAccuracy: null, guessCount: 0 }),
    ]);
    expect(markup.split('class="scatter-mark--arena"').length - 1).toBe(3);
    expect(markup).toContain("2 words await their first rating.");
    expect(markup).toContain("One word awaits its first guess.");
    expect(markup).toContain("pool words have yet to enter the record");
  });

  it("keeps the empty record honest — no arena marks, no NaN", () => {
    const markup = render([]);
    expect(markup).not.toContain('class="scatter-mark--arena"');
    expect(markup).not.toContain("NaN");
  });
});

describe("DivergenceScatter axes and framing", () => {
  it("labels the axes in the adjudicated units", () => {
    const markup = render([]);
    expect(markup).toContain("Accuracy · % correct");
    expect(markup).toContain("Rating · z within study");
  });

  it("carries the binding correlation footnote and scale disclosure", () => {
    const markup = render([]);
    expect(markup).toContain("+.44");
    expect(markup).toContain("+.65");
    expect(markup).toContain("The two measures see different things");
    expect(markup).toContain("standardized within its own study");
    expect(markup).not.toContain("unrelated");
    expect(markup).not.toContain("orthogonal");
  });

  it("starts with no tooltip in the markup", () => {
    expect(render(THREE_ELIGIBLE)).not.toContain('class="chart-tooltip"');
  });
});

describe("DivergenceScatter session crosshair", () => {
  it("draws both lines when the player has ratings and the arena layer stands", () => {
    const markup = render(THREE_ELIGIBLE, { accuracy: 0.63, meanRating: 4.2 });
    expect(markup).toContain("This session · 63%");
    expect(markup).toContain("Your ratings · 4.2 / 7");
  });

  it("carries a text twin of the crosshair — the SVG overlay is aria-hidden", () => {
    const markup = render(THREE_ELIGIBLE, { accuracy: 0.63, meanRating: 4.2 });
    expect(markup).toContain(
      "This session lands at 63% accuracy with a mean rating of 4.2 / 7",
    );
    const withoutRatings = render(THREE_ELIGIBLE, {
      accuracy: 0.63,
      meanRating: null,
    });
    expect(withoutRatings).toContain("This session lands at 63% accuracy.");
    expect(render(THREE_ELIGIBLE, null)).not.toContain("This session lands");
  });

  it("omits the y-line when the player has no ratings", () => {
    const markup = render(THREE_ELIGIBLE, { accuracy: 0.63, meanRating: null });
    expect(markup).toContain("This session · 63%");
    expect(markup).not.toContain("Your ratings");
  });

  it("omits the y-line when the arena layer is suppressed", () => {
    const markup = render(
      THREE_ELIGIBLE.slice(0, 2),
      { accuracy: 0.63, meanRating: 4.2 },
    );
    expect(markup).toContain("This session · 63%");
    expect(markup).not.toContain("Your ratings");
  });

  it("draws nothing without a session marker", () => {
    expect(render(THREE_ELIGIBLE)).not.toContain("This session");
  });
});

describe("DivergenceScatter table twin", () => {
  it("carries every layer's rows in native scales", () => {
    const markup = render(THREE_ELIGIBLE);
    expect(markup).toContain('id="observatory-scatter-table"');
    expect(markup).toContain("· normalized"); // McLean native coding
    expect(markup).toContain("McLean 2023");
    expect(markup).toContain("Thesis");
    expect(markup).toContain("Arena");
  });
});

describe("DivergenceScatter kana labels", () => {
  const WITH_KANA = [
    makeRow({ meanRating: 3, displayForm: "ごそごそ" }),
    makeRow({ ideophoneId: 2, romaji: "katakata", meanRating: 5, displayForm: "カタカタ" }),
    makeRow({ ideophoneId: 3, romaji: "kirakira", meanRating: 6.5, displayForm: "きらきら" }),
  ];

  it("renders verbatim kana with lang=ja on arena words carrying displayForm", () => {
    const markup = render(WITH_KANA);
    expect(markup).toContain('lang="ja"');
    expect(markup).toContain("ごそごそ");
  });

  it("stays romaji-only when neither displayForm nor a kana map is present", () => {
    expect(render(THREE_ELIGIBLE)).not.toContain('lang="ja"');
  });

  it("wears kana on thesis marks when the live record supplies it by romaji", () => {
    const markup = render([], null, new Map([["gosogoso", "ごそごそ"]]));
    expect(markup).toContain('lang="ja"');
    expect(markup).toContain("ごそごそ");
  });
});
