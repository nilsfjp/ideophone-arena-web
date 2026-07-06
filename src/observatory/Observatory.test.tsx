import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DivergenceEntry } from "../api/types";
import { ObservatoryView, type DivergenceState } from "./Observatory";

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

function render(divergence: DivergenceState) {
  return renderToStaticMarkup(
    <ObservatoryView
      divergence={divergence}
      session={null}
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

  it("survives an EMPTY divergence response — the deploy-day reality", () => {
    const markup = render({ status: "ready", rows: [] });
    // Counts read an honest zero; every panel and slot still renders.
    expect(markup).toContain("The record opens with the first guess.");
    expect(markup).toContain("observatory-panel--dumbbell");
    expect(markup).toContain("observatory-panel--scatter");
    expect(markup).toContain("observatory-panel--radar");
    expect(markup).toContain("The semantic network");
    expect(markup).toContain("The confusion matrix");
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

  it("degrades honestly on a live-record error — reference layers stand", () => {
    const markup = render({ status: "error" });
    expect(markup).toContain("The live record is unreachable right now.");
    expect(markup).toContain("observatory-panel--radar"); // vendored, unaffected
    expect(markup).toContain("68.6%"); // thesis dumbbell layer still there
    expect(markup).not.toContain("NaN");
  });

  it("shows the loading status before the record arrives", () => {
    expect(render({ status: "loading" })).toContain("Opening the record…");
  });

  it("carries the attribution footer — mandatory, all three sources", () => {
    const markup = render({ status: "ready", rows: [] });
    expect(markup).toContain("Paulsson (2026)");
    expect(markup).toContain("Two measures are better than one");
    expect(markup).toContain("Iida &amp; Akita (2023)");
  });
});
