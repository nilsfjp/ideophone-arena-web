import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { IdeophoneOption } from "../api/types";
import { getConditionPresentation } from "../conditionPresentation";
import IdeophoneCard from "./IdeophoneCard";

const option: IdeophoneOption = {
  ideophoneId: 62,
  kana: "かたかた",
  displayForm: "カタカタ",
  canonicalForm: "カタカタ",
  romaji: "katakata",
  canonicalScript: "KK",
};

describe("IdeophoneCard choice accessibility", () => {
  // Invariant 7: during choice the accessibility tree must identify the card
  // by position only - no kana, romaji, or meaning before feedback.
  it("uses a position-only aria-label in button mode", () => {
    const markup = renderToStaticMarkup(
      <IdeophoneCard
        mode="button"
        option={option}
        positionLabel="A"
        presentation={getConditionPresentation("CONDITION_1_SOKUON")}
      />,
    );

    const labels = [...markup.matchAll(/aria-label="([^"]*)"/g)].map(
      (match) => match[1],
    );
    expect(labels).toContain("Choose card A");
    for (const label of labels) {
      expect(label).not.toMatch(/katakata|かたかた|カタカタ/);
    }
  });

  it("keeps the card content mounted while hidden so the slot reserves space", () => {
    const markup = renderToStaticMarkup(
      <IdeophoneCard
        option={option}
        positionLabel="B"
        presentation={getConditionPresentation("CONDITION_1_SOKUON")}
        visible={false}
      />,
    );

    expect(markup).toContain("ideophone-card");
    expect(markup).toContain("empty");
    expect(markup).toContain("placeholder-display");
  });

  // §8 identity symmetry: both cards must carry byte-identical replay
  // affordances so nothing marks the target. The only permitted difference is
  // the position label in the aria-label.
  it("renders byte-identical replay controls on card A and card B", () => {
    function replayControl(label: string) {
      const markup = renderToStaticMarkup(
        <IdeophoneCard
          mode="button"
          option={option}
          positionLabel={label}
          presentation={getConditionPresentation("CONDITION_1_SOKUON")}
          replayVisible
          visible
          onReplay={() => {}}
        />,
      );
      const match = markup.match(
        /<button[^>]*card-replay-button[\s\S]*?<\/button>/,
      );
      expect(match, `card ${label} should render a replay control`).not.toBeNull();
      return match![0];
    }

    const a = replayControl("A");
    const b = replayControl("B");

    // Position-only label (invariant 7); never the word.
    expect(a).toContain('aria-label="Replay card A"');
    expect(b).toContain('aria-label="Replay card B"');
    for (const control of [a, b]) {
      expect(control).not.toMatch(/katakata|かたかた|カタカタ/);
    }

    expect(a.replace("Replay card A", "Replay card X")).toBe(
      b.replace("Replay card B", "Replay card X"),
    );
  });
});
