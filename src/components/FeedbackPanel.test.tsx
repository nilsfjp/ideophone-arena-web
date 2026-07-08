import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnswerResultResponse, RoundResponse } from "../api/types";
import FeedbackPanel from "./FeedbackPanel";

const round: RoundResponse = {
  sessionUuid: "session-1",
  roundId: 7,
  targetTranslation: "clattering, rattling",
  conditionName: "CONDITION_1_SOKUON",
  targetMeaningListedFirst: true,
  translations: {
    target: "clattering, rattling",
    other: "noisily gushing",
  },
  left: {
    ideophoneId: 62,
    kana: "かたかた",
    displayForm: "カタカタ",
    canonicalForm: "カタカタ",
    romaji: "katakata",
  },
  right: {
    ideophoneId: 125,
    kana: "じゃあじゃあ",
    displayForm: "ジャージャー",
    canonicalForm: "じゃーじゃー",
    romaji: "zyaazyaa",
  },
};

function makeResult(correct: boolean): AnswerResultResponse {
  return {
    roundId: 7,
    correct,
    selectedIdeophoneId: 62,
    correctIdeophoneId: correct ? 62 : 125,
    targetTranslation: "clattering, rattling",
    totalAnswered: 1,
    totalCorrect: correct ? 1 : 0,
  };
}

function countOccurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

// Both outcomes must reserve two summary-card cells so panel height never
// depends on correctness; the correct outcome hides its second card.
describe("FeedbackPanel outcome-height parity", () => {
  it("renders two visible cards when incorrect", () => {
    const markup = renderToStaticMarkup(
      <FeedbackPanel result={makeResult(false)} round={round} />,
    );

    expect(countOccurrences(markup, "feedback-choice-card")).toBe(2);
    expect(countOccurrences(markup, "slot-hidden")).toBe(0);
    expect(markup).toContain("You chose");
    expect(markup).toContain("Correct word");
  });

  it("reserves a hidden second card when correct", () => {
    const markup = renderToStaticMarkup(
      <FeedbackPanel result={makeResult(true)} round={round} />,
    );

    expect(countOccurrences(markup, "feedback-choice-card")).toBe(2);
    // §11.2: assert the hidden card via its semantic classes + aria-hidden,
    // tolerant of appended utilities (hook stays first per §5).
    expect(markup).toMatch(
      /<article class="feedback-choice-card[^"]*\bslot-hidden\b[^"]*"[^>]*aria-hidden="true"/,
    );
    expect(markup).toContain("You chose");
  });
});
