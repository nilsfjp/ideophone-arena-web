import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RoundResponse } from "../api/types";
import {
  CHOICE_QUESTION_PREFIX,
  CHOICE_QUESTION_SUFFIX,
  LISTEN_INSTRUCTION,
  MEANING_OTHER_PREFIX,
  MEANING_TARGET_PREFIX,
} from "../experimentText";
import TrialPlayer from "./TrialPlayer";

const roundMissingDisplayForm: RoundResponse = {
  sessionUuid: "session-1",
  roundId: 1,
  targetTranslation: "clattering, rattling",
  conditionName: "CONDITION_3_SOKUON",
  difficultyLevel: 1,
  left: {
    ideophoneId: 121,
    kana: "ごそごそ",
    canonicalForm: "ごそごそ",
    romaji: "gosogoso",
  },
  right: {
    ideophoneId: 122,
    kana: "かたかた",
    displayForm: "かたかた",
    canonicalForm: "カタカタ",
    romaji: "katakata",
  },
};

const validRound: RoundResponse = {
  sessionUuid: "session-1",
  roundId: 7,
  targetTranslation: "clattering, rattling",
  conditionName: "CONDITION_1_SOKUON",
  difficultyLevel: 1,
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

function renderTrialBoard(round: RoundResponse) {
  return renderToStaticMarkup(
    <TrialPlayer
      round={round}
      sessionStats={{ answered: 0, correct: 0 }}
      sessionUuid="session-1"
      totalRounds={30}
      onAnswered={() => {}}
      onAuthExpired={() => {}}
      onBackToStart={() => {}}
      onNeedNextRound={() => {}}
    />,
  );
}

function countOccurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe("TrialPlayer frozen experiment text", () => {
  // The board mounts every slot at fixation, so the initial static render
  // must already contain each frozen string exactly once, in its slot.
  it("renders each frozen string exactly once in its designated slot", () => {
    const markup = renderTrialBoard(validRound);

    expect(countOccurrences(markup, LISTEN_INSTRUCTION)).toBe(1);
    expect(markup).toContain(`<p>${LISTEN_INSTRUCTION}</p>`);

    expect(countOccurrences(markup, MEANING_TARGET_PREFIX)).toBe(1);
    expect(markup).toContain(
      `${MEANING_TARGET_PREFIX}<strong>clattering, rattling</strong>`,
    );
    expect(countOccurrences(markup, MEANING_OTHER_PREFIX)).toBe(1);
    expect(markup).toContain(
      `${MEANING_OTHER_PREFIX}<strong>noisily gushing</strong>`,
    );

    expect(countOccurrences(markup, CHOICE_QUESTION_PREFIX)).toBe(1);
  });

  it("renders the canonical question with bolded target followed by the question mark", () => {
    const markup = renderTrialBoard(validRound);
    expect(markup).toContain(
      `${CHOICE_QUESTION_PREFIX}<strong>clattering, rattling</strong>${CHOICE_QUESTION_SUFFIX}`,
    );
    expect(markup).not.toContain(`"clattering, rattling"`);
  });
});

describe("TrialPlayer reserved question slot", () => {
  // The Next round button shares the reserved question slot with the choice
  // question; both mount at fixation and toggle via visibility (invariant 5).
  it("mounts the Next round button inside the question slot, hidden and disabled", () => {
    const markup = renderTrialBoard(validRound);

    expect(countOccurrences(markup, "Next round")).toBe(1);
    const slotStart = markup.indexOf('class="question-slot"');
    expect(slotStart).toBeGreaterThan(-1);
    const slotMarkup = markup.slice(slotStart, markup.indexOf("status-line"));
    expect(slotMarkup).toContain(CHOICE_QUESTION_PREFIX);
    expect(slotMarkup).toContain("Next round");
    expect(slotMarkup).toMatch(
      /<button[^>]*feedback-next-button slot-hidden[^>]*disabled[^>]*>Next round<\/button>/,
    );
  });

  it("does not render the old button position outside the trial board", () => {
    const markup = renderTrialBoard(validRound);
    const boardEnd = markup.lastIndexOf("status-line");
    expect(markup.indexOf("Next round")).toBeLessThan(boardEnd);
  });
});

describe("TrialPlayer practice rounds", () => {
  it("replaces the round counter and score readout with the practice header", () => {
    const markup = renderTrialBoard({ ...validRound, practice: true });

    expect(markup).toContain("Practice round");
    expect(markup).toContain("Not scored");
    expect(markup).not.toContain("Round 1 / 30");
    expect(markup).not.toContain("Session score");
  });

  it("keeps the scored-round header when the practice flag is absent or false", () => {
    for (const round of [validRound, { ...validRound, practice: false }]) {
      const markup = renderTrialBoard(round);

      expect(markup).toContain("Round 1 / 30");
      expect(markup).toContain("Session score: 0 / 0");
      expect(markup).not.toContain("Practice round");
      expect(markup).not.toContain("Not scored");
    }
  });

  it("renders the same trial board and feedback slots during practice", () => {
    const markup = renderTrialBoard({ ...validRound, practice: true });

    expect(markup).toContain(`<p>${LISTEN_INSTRUCTION}</p>`);
    expect(countOccurrences(markup, CHOICE_QUESTION_PREFIX)).toBe(1);
    expect(countOccurrences(markup, "Next round")).toBe(1);
    expect(markup).toContain("progress-track");
  });
});

describe("TrialPlayer round validation wiring", () => {
  it("shows the round-problem panel instead of guessing a display form", () => {
    const markup = renderToStaticMarkup(
      <TrialPlayer
        round={roundMissingDisplayForm}
        sessionStats={{ answered: 0, correct: 0 }}
        sessionUuid="session-1"
        totalRounds={30}
        onAnswered={() => {}}
        onAuthExpired={() => {}}
        onBackToStart={() => {}}
        onNeedNextRound={() => {}}
      />,
    );

    expect(markup).toContain("Round unavailable");
    expect(markup).toContain("displayForm");
    expect(markup).not.toContain("script-display-text");
  });
});
