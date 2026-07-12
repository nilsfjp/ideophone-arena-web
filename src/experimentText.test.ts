import { describe, expect, it } from "vitest";
import * as experimentText from "./experimentText";
import {
  CHOICE_QUESTION_PREFIX,
  LISTEN_INSTRUCTION,
  MEANING_OTHER_PREFIX,
  MEANING_TARGET_PREFIX,
  MINT_BACK_BUTTON,
  MINT_BAND_ALMOST,
  MINT_BAND_DIFFERENT,
  MINT_BAND_MOST,
  MINT_BAND_SOME,
  MINT_CHIP_LENGTH_PREFIX,
  MINT_CHIP_LENGTH_SUFFIX,
  MINT_CHIP_SOKUON,
  MINT_INSTRUCTION,
  MINT_NEXT_BUTTON,
  MINT_ONE_SHOT_LABEL,
  MINT_ONE_SHOT_SUPPORT,
  MINT_PARSE_ERROR_BETWEEN,
  MINT_PARSE_ERROR_EXAMPLE_ONE,
  MINT_PARSE_ERROR_EXAMPLE_TWO,
  MINT_PARSE_ERROR_PREFIX,
  MINT_PARSE_ERROR_SUFFIX,
  MINT_REVEAL_PREFIX,
  MINT_REVEAL_SUFFIX,
  MINT_SCORE_LABEL,
  MINT_STATUS_MEAN_PREFIX,
  MINT_STATUS_OF,
  MINT_STATUS_WORD_PREFIX,
  MINT_SUBMIT_BUTTON,
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
  // Word Mint (NIL-83). Same rule: distinctive phrases only.
  MINT_INSTRUCTION,
  MINT_ONE_SHOT_SUPPORT,
  MINT_PARSE_ERROR_PREFIX,
  MINT_REVEAL_PREFIX,
  MINT_BAND_ALMOST,
  MINT_BAND_MOST,
  MINT_BAND_SOME,
  MINT_BAND_DIFFERENT,
];

const sourceFiles = import.meta.glob("./**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("player-facing copy is language-neutral (NIL-85, adjudicated 2026-07-10)", () => {
  // The neutrality principle, first adjudicated for Word Mint and now extended to
  // the whole module (both frozen blocks amended). No participant-facing string
  // names the language: the kana and the romaji examples carry it implicitly, which
  // is what keeps the cross-linguistic mode possible. Guarding every export rather
  // than a hand-listed set, so a newly added string cannot reintroduce the name.
  it("no exported string names a language", () => {
    const offenders = Object.entries(experimentText)
      .filter(
        ([, value]) => typeof value === "string" && /japan/i.test(value),
      )
      .map(([name]) => name);
    expect(offenders).toEqual([]);
  });
});

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
      " words from the previous task. In each trial, you will be shown a word together with its English meaning. Your task is to rate how much you think the word resembles its meaning on a scale from ",
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
    expect(RATING_LISTEN_LINE_1).toBe("Listen to the word below.");
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

describe("Word Mint strings are frozen verbatim (NIL-83, adjudicated 2026-07-06)", () => {
  // SPEC-view-designs.md §8. Authored sentence case and uppercased by CSS
  // (.specimen / .mint-chip): §8 prints them uppercase because that is their
  // rendered form. Player copy is language-neutral (enforced module-wide below).
  it("keeps the prompt-state wording exactly", () => {
    expect(MINT_INSTRUCTION).toBe(
      "Invent a word whose sound fits the meaning below. Type it in roman letters.",
    );
    expect(MINT_ONE_SHOT_LABEL).toBe("One try per word");
    expect(MINT_ONE_SHOT_SUPPORT).toBe("Your first instinct is the data.");
    expect(MINT_SUBMIT_BUTTON).toBe("Mint this word");
  });

  it("reassembles the parse helper exactly as adjudicated", () => {
    const helper =
      MINT_PARSE_ERROR_PREFIX +
      `*${MINT_PARSE_ERROR_EXAMPLE_ONE}*` +
      MINT_PARSE_ERROR_BETWEEN +
      `*${MINT_PARSE_ERROR_EXAMPLE_TWO}*` +
      MINT_PARSE_ERROR_SUFFIX;
    expect(helper).toBe(
      "That didn't read as speakable syllables — try simple roman letters, like *gorogoro* or *pika*.",
    );
  });

  it("keeps the reveal-state wording exactly", () => {
    expect(MINT_REVEAL_PREFIX + "**{displayForm}**" + MINT_REVEAL_SUFFIX).toBe(
      "The real word is **{displayForm}**.",
    );
    expect(MINT_SCORE_LABEL.toUpperCase()).toBe("SIMILARITY · 0–100");
    expect(MINT_NEXT_BUTTON).toBe("Next meaning");
    expect(MINT_BACK_BUTTON).toBe("Back to modes");
  });

  it("keeps each score band exactly, as a standalone caption", () => {
    // §8.2 as amended by NIL-85: the numeral is no longer part of the sentence
    // (the score figure carries it), and no band contains an em-dash.
    expect(MINT_BAND_ALMOST).toBe("Your instinct is almost the same word.");
    expect(MINT_BAND_MOST).toBe(
      "Your instinct shares most of its shape with the real word.",
    );
    expect(MINT_BAND_SOME).toBe(
      "Your word and the real one share some bones.",
    );
    expect(MINT_BAND_DIFFERENT).toBe(
      "A different creature, which is also data.",
    );
    for (const band of [
      MINT_BAND_ALMOST,
      MINT_BAND_MOST,
      MINT_BAND_SOME,
      MINT_BAND_DIFFERENT,
    ]) {
      expect(band).not.toContain("\u2014");
      expect(band).toBe(band.trim());
    }
  });

  it("keeps the chip and status vocabularies exactly", () => {
    // The "· Q" notation matches the scorer's normalization and is deliberate.
    expect(MINT_CHIP_SOKUON.toUpperCase()).toBe("SHARP CUT · Q");
    expect(
      (MINT_CHIP_LENGTH_PREFIX + "{n}" + MINT_CHIP_LENGTH_SUFFIX).toUpperCase(),
    ).toBe("LENGTH · {N} MORAE");
    expect(
      (
        MINT_STATUS_WORD_PREFIX +
        "{i}" +
        MINT_STATUS_OF +
        "{n}" +
        MINT_STATUS_MEAN_PREFIX +
        "{m}"
      ).toUpperCase(),
    ).toBe("WORD {I} OF {N} · YOUR MEAN {M}");
  });
});
