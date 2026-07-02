import { describe, expect, it } from "vitest";
import {
  CHOICE_QUESTION_PREFIX,
  LISTEN_INSTRUCTION,
  MEANING_OTHER_PREFIX,
  MEANING_TARGET_PREFIX,
  RATING_ANCHOR_HIGH_INLINE,
  RATING_ANCHOR_LOW_INLINE,
  RATING_HOW_TO,
  RATING_INDICATES,
  RATING_INTRO_AFTER_COUNT,
  RATING_INTRO_PREFIX,
  RATING_INTRO_TO,
  RATING_LISTEN_LINE_1,
  RATING_LISTEN_LINE_2,
  RATING_MEANING_PREFIX,
  RATING_NEXT_BUTTON,
  RATING_QUESTION,
  RATING_REPLAY_BUTTON,
  RATING_SCALE_HIGH_LABEL,
  RATING_SCALE_LOW_LABEL,
  RATING_SCALE_MAX,
  RATING_SCALE_MIN,
  RATING_SENTENCE_END,
  RATING_WHILE,
} from "./experimentText";

const FROZEN_PHRASES = [
  LISTEN_INSTRUCTION,
  MEANING_TARGET_PREFIX,
  MEANING_OTHER_PREFIX,
  CHOICE_QUESTION_PREFIX,
  // Rating Task phrases distinctive enough to catch inline copies (short
  // connectives like " to " would false-positive on ordinary prose).
  RATING_INTRO_PREFIX,
  RATING_INTRO_AFTER_COUNT,
  RATING_HOW_TO,
  RATING_LISTEN_LINE_1,
  RATING_LISTEN_LINE_2,
  RATING_MEANING_PREFIX,
  RATING_QUESTION,
  RATING_SCALE_LOW_LABEL,
  RATING_SCALE_HIGH_LABEL,
];

const sourceFiles = import.meta.glob("./**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("frozen trial text lives only in experimentText.ts", () => {
  // Invariant 1: src/experimentText.ts is the single home of participant-facing
  // trial strings. Components must import them, never inline them.
  it("no component contains an inline copy of a frozen phrase", () => {
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(sourceFiles)) {
      if (/\.test\.(ts|tsx)$/.test(path) || path === "./experimentText.ts") {
        continue;
      }
      for (const phrase of FROZEN_PHRASES) {
        if (text.includes(phrase)) {
          offenders.push(`${path}: "${phrase}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("rating task strings are frozen verbatim (27D, adjudicated 2026-07-02)", () => {
  // Gorilla/thesis-verbatim copy; see docs/research/design-archive/
  // gorilla-rating-task-*.png. Changing any of these alters the instrument.
  it("keeps the adjudicated wording exactly", () => {
    expect(RATING_INTRO_PREFIX).toBe("In this task, you will rate ");
    expect(RATING_INTRO_AFTER_COUNT).toBe(
      " words from the previous task. In each trial, you will be shown a Japanese word together with its English meaning. Your task is to rate how much you think the word resembles its meaning on a scale from ",
    );
    expect(RATING_INTRO_TO).toBe(" to ");
    expect(RATING_SENTENCE_END).toBe(".");
    expect(RATING_SCALE_MIN).toBe("1");
    expect(RATING_SCALE_MAX).toBe("7");
    expect(RATING_INDICATES).toBe(" indicates ");
    expect(RATING_WHILE).toBe(" while ");
    expect(RATING_ANCHOR_LOW_INLINE).toBe("no resemblance");
    expect(RATING_ANCHOR_HIGH_INLINE).toBe("strong resemblance");
    expect(RATING_HOW_TO).toBe(
      "Click on a number (1–7) to select your rating, then press 'Next' to submit your response.",
    );
    expect(RATING_LISTEN_LINE_1).toBe("Listen to the Japanese word below.");
    expect(RATING_LISTEN_LINE_2).toBe("Click to replay.");
    expect(RATING_MEANING_PREFIX).toBe("It means ");
    expect(RATING_QUESTION).toBe(
      "Do you think there is a resemblance between the word and its meaning?",
    );
    expect(RATING_SCALE_LOW_LABEL).toBe("No resemblance");
    expect(RATING_SCALE_HIGH_LABEL).toBe("Strong resemblance");
    expect(RATING_REPLAY_BUTTON).toBe("Replay");
    expect(RATING_NEXT_BUTTON).toBe("Next");
  });
});
