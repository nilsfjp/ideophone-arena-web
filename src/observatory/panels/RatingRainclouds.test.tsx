import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  RatingDistributionCell,
  RatingDistributionsResponse,
} from "../../api/types";
import type { RatingDistributionsState } from "../Observatory";
import RatingRainclouds from "./RatingRainclouds";

function cells(modality: string, counts: number[]): RatingDistributionCell[] {
  return counts.map((count, i) => ({ modality, ratingValue: i + 1, count }));
}

const READY: RatingDistributionsResponse = {
  distributions: [
    ...cells("AUDITORY", [1, 2, 3, 4, 3, 2, 1]),
    ...cells("VISUAL", [0, 1, 2, 5, 4, 2, 1]),
    ...cells("INTEROCEPTIVE", [2, 2, 2, 2, 2, 2, 2]),
  ],
  byModalityN: { AUDITORY: 16, VISUAL: 15, INTEROCEPTIVE: 14 },
};

function render(distributions: RatingDistributionsState) {
  return renderToStaticMarkup(
    <RatingRainclouds distributions={distributions} />,
  );
}

describe("RatingRainclouds", () => {
  it("draws a thesis silhouette and a live violin per trio modality, no NaN", () => {
    const markup = render({ status: "ready", data: READY });
    expect(markup).toContain("raincloud-violin--thesis");
    expect(markup).toContain("raincloud-violin--arena");
    expect(markup).toContain("raincloud-dot");
    expect(markup).toContain("N = 16");
    expect(markup).not.toContain("NaN");
  });

  it("keeps the thesis reference and awaits data when the record is empty", () => {
    const markup = render({
      status: "ready",
      data: { distributions: [], byModalityN: {} },
    });
    // Thesis silhouette always renders (vendored), live violin does not.
    expect(markup).toContain("raincloud-violin--thesis");
    expect(markup).not.toContain("raincloud-violin--arena");
    expect(markup).toContain("Awaiting the first rating");
    expect(markup).toContain("N = 0");
    expect(markup).not.toContain("NaN");
  });

  it("degrades honestly on error — thesis stands, N is em-dash not 0", () => {
    const markup = render({ status: "error" });
    expect(markup).toContain("raincloud-violin--thesis");
    expect(markup).toContain("N = —");
    expect(markup).toContain("unreachable");
    expect(markup).not.toContain("NaN");
  });

  it("discloses when the raw dots are a subsample", () => {
    const markup = render({
      status: "ready",
      data: {
        distributions: cells("AUDITORY", [700, 0, 0, 0, 0, 0, 300]),
        byModalityN: { AUDITORY: 1000 },
      },
    });
    expect(markup).toContain("showing");
    expect(markup).toContain("of 1000 ratings as dots");
    expect(markup).not.toContain("NaN");
  });

  it("ships the data-table twin with both layers", () => {
    const markup = render({ status: "ready", data: READY });
    expect(markup).toContain('id="observatory-rainclouds-table"');
    expect(markup).toContain("Thesis");
    expect(markup).toContain("Arena");
  });
});
