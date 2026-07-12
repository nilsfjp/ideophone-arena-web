import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  DivergenceEntry,
  PositionBiasResponse,
  RatingDistributionsResponse,
} from "../api/types";
import {
  ObservatoryView,
  type DivergenceState,
  type PositionBiasState,
  type RatingDistributionsState,
} from "./Observatory";

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

const EMPTY_DIST: RatingDistributionsResponse = {
  distributions: [],
  byModalityN: {},
};

const EMPTY_BIAS: PositionBiasResponse = {
  n: 0,
  leftPickCount: 0,
  rightPickCount: 0,
  leftPickRate: null,
  dPrime: null,
  criterion: null,
  targetTopN: 0,
  targetTopCorrect: 0,
  targetTopAccuracy: null,
  targetBottomN: 0,
  targetBottomCorrect: 0,
  targetBottomAccuracy: null,
};

function render(
  divergence: DivergenceState,
  opts: {
    ratingDistributions?: RatingDistributionsState;
    positionBias?: PositionBiasState;
    kanaByRomaji?: ReadonlyMap<string, string>;
  } = {},
) {
  return renderToStaticMarkup(
    <ObservatoryView
      divergence={divergence}
      ratingDistributions={
        opts.ratingDistributions ?? { status: "ready", data: EMPTY_DIST }
      }
      positionBias={opts.positionBias ?? { status: "ready", data: EMPTY_BIAS }}
      session={null}
      kanaByRomaji={opts.kanaByRomaji ?? new Map()}
      onBackToHome={() => {}}
    />,
  );
}

describe("ObservatoryView shell", () => {
  it("renders the header strip with chip, register line, and wave rule", () => {
    const markup = render({ status: "ready", rows: [] });
    expect(markup).toContain('<section class="observatory">');
    expect(markup).toContain("The Observatory");
    expect(markup).toContain("Record · All players");
    expect(markup).toContain(
      "Every guess and rating in the arena, aggregated live.",
    );
    expect(markup).toContain('class="wave-rule"');
  });

  it("survives an EMPTY divergence response - the deploy-day reality", () => {
    const markup = render({ status: "ready", rows: [] });
    // Counts read an honest zero; every panel and slot still renders.
    expect(markup).toContain("The record opens with the first guess.");
    expect(markup).toContain("observatory-panel--dumbbell");
    expect(markup).toContain("observatory-panel--scatter");
    expect(markup).toContain("observatory-panel--radar");
    expect(markup).toContain("observatory-panel--rainclouds");
    expect(markup).toContain("observatory-panel--integrity");
    expect(markup).toContain("The semantic network");
    expect(markup).toContain("The confusion matrix");
    expect(markup).not.toContain("NaN");
  });

  it("orders the arc scatter → radar → rainclouds → integrity → coming-soon", () => {
    const markup = render({ status: "ready", rows: [] });
    const order = [
      "observatory-panel--scatter",
      "observatory-panel--radar",
      "observatory-panel--rainclouds",
      "observatory-panel--integrity",
      "The semantic network",
    ].map((hook) => markup.indexOf(hook));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
  });

  it("degrades the two new panels independently of the divergence record", () => {
    const markup = render(
      { status: "ready", rows: [] },
      {
        ratingDistributions: { status: "error" },
        positionBias: { status: "error" },
      },
    );
    expect(markup).toContain("observatory-panel--rainclouds"); // thesis stands
    expect(markup).toContain("A fair coin, checked");
    expect(markup).not.toContain("NaN");
  });

  it("sums live counts across every row, whatever the modality", () => {
    const markup = render({
      status: "ready",
      rows: [
        makeRow({ guessCount: 7, ratingCount: 2 }),
        makeRow({
          ideophoneId: 2,
          modality: "PRACTICE",
          guessCount: 3,
          ratingCount: 1,
        }),
      ],
    });
    expect(markup).toContain(">10</dd>");
    expect(markup).toContain(">3</dd>");
  });

  it("degrades honestly on a live-record error - reference layers stand", () => {
    const markup = render({ status: "error" });
    expect(markup).toContain("The live record is unreachable right now.");
    expect(markup).toContain("observatory-panel--radar"); // vendored, unaffected
    expect(markup).toContain("68.6%"); // thesis dumbbell layer still there
    expect(markup).not.toContain("NaN");
  });

  it("shows the loading status before the record arrives", () => {
    expect(render({ status: "loading" })).toContain("Opening the record…");
  });

  it("carries the attribution footer - mandatory, all three sources", () => {
    const markup = render({ status: "ready", rows: [] });
    expect(markup).toContain("Paulsson (2025)");
    expect(markup).toContain(
      "Unimodal and Cross-Modal Iconicity in Japanese Ideophones",
    );
    expect(markup).toContain("Two measures are better than one");
    expect(markup).toContain("Iida &amp; Akita (2023)");
  });
});
