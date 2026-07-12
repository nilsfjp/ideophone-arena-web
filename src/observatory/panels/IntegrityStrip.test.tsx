import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PositionBiasResponse } from "../../api/types";
import type { PositionBiasState } from "../Observatory";
import IntegrityStrip from "./IntegrityStrip";

const READY: PositionBiasResponse = {
  n: 612,
  leftPickCount: 312,
  rightPickCount: 300,
  leftPickRate: 0.51,
  dPrime: 1.42,
  criterion: -0.03,
  targetTopN: 305,
  targetTopCorrect: 192,
  targetTopAccuracy: 0.63,
  targetBottomN: 307,
  targetBottomCorrect: 187,
  targetBottomAccuracy: 0.609,
};

const EMPTY: PositionBiasResponse = {
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

function render(positionBias: PositionBiasState) {
  return renderToStaticMarkup(<IntegrityStrip positionBias={positionBias} />);
}

describe("IntegrityStrip", () => {
  it("carries the frozen copy and the 50% fair hairline", () => {
    const markup = render({ status: "ready", data: READY });
    expect(markup).toContain("A fair coin, checked");
    expect(markup).toContain("Fair · 50%");
    expect(markup).toContain("chart-chance");
    expect(markup).not.toContain("orthogonal");
  });

  it("renders three markers and the d′/criterion readout, no NaN", () => {
    const markup = render({ status: "ready", data: READY });
    const markers = markup.match(/integrity-marker/g) ?? [];
    expect(markers.length).toBe(3);
    expect(markup).toContain("1.42"); // d′
    expect(markup).toContain("−0.03"); // criterion, U+2212 minus
    expect(markup).toContain("312/612"); // left-pick direct label
    expect(markup).not.toContain("NaN");
  });

  it("degrades to em-dashes and no markers when n = 0", () => {
    const markup = render({ status: "ready", data: EMPTY });
    expect(markup).not.toContain("integrity-marker");
    expect(markup).toContain("Awaiting the first scored round");
    expect(markup).toContain("–");
    expect(markup).not.toContain("NaN");
  });

  it("degrades honestly on error", () => {
    const markup = render({ status: "error" });
    expect(markup).not.toContain("integrity-marker");
    expect(markup).toContain("unreachable");
    expect(markup).not.toContain("NaN");
  });

  it("ships the data-table twin", () => {
    const markup = render({ status: "ready", data: READY });
    expect(markup).toContain('id="observatory-integrity-table"');
    expect(markup).toContain("Right card picked");
  });
});
