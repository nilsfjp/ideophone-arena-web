import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerResultResponse, RoundResponse } from "./api/types";
import {
  RATING_POOL_STORAGE_KEY,
  addWordsToPool,
  extractRoundWords,
  parsePool,
  readRatingPool,
  serializePool,
  writeRatingPool,
  type RatingPoolWord,
} from "./ratingPool";

const NOW = "2026-07-02T12:00:00.000Z";

const round: RoundResponse = {
  sessionUuid: "session-1",
  roundId: 11,
  targetTranslation: "clanging, banging",
  conditionName: "CONDITION_1_SOKUON",
  difficultyLevel: 1,
  translations: { target: "clanging, banging", other: "rustling" },
  left: {
    ideophoneId: 7,
    canonicalForm: "カンカン",
    romaji: "kankan",
    stimulusUrl: "/stimuli/audio/a0a-kankan.m4a",
    modality: "AUDITORY",
  },
  right: {
    ideophoneId: 9,
    canonicalForm: "ごそごそ",
    romaji: "gosogoso",
    stimulusFile: "a0h-gosogoso.m4a",
    modality: "AUDITORY",
  },
};

const result: AnswerResultResponse = {
  roundId: 11,
  selectedIdeophoneId: 9,
  correctIdeophoneId: 7,
  correct: false,
  targetTranslation: "clanging, banging",
  totalAnswered: 1,
  totalCorrect: 0,
};

function poolWord(overrides: Partial<RatingPoolWord>): RatingPoolWord {
  return {
    ideophoneId: 1,
    meaning: "rustling",
    sessionUuid: "session-1",
    addedAt: NOW,
    ...overrides,
  };
}

describe("extractRoundWords", () => {
  it("maps the correct word to the target meaning and the other word to translations.other", () => {
    const words = extractRoundWords(round, result, NOW);

    expect(words).toHaveLength(2);
    const [left, right] = words;
    expect(left.ideophoneId).toBe(7);
    expect(left.meaning).toBe("clanging, banging");
    expect(left.canonicalForm).toBe("カンカン");
    expect(left.romaji).toBe("kankan");
    expect(left.stimulusUrl).toBe("/stimuli/audio/a0a-kankan.m4a");
    expect(left.sessionUuid).toBe("session-1");
    expect(left.addedAt).toBe(NOW);
    expect(right.ideophoneId).toBe(9);
    expect(right.meaning).toBe("rustling");
    expect(right.stimulusFile).toBe("a0h-gosogoso.m4a");
  });

  it("falls back to selectedIdeophoneId as the correct id when correct is true", () => {
    const words = extractRoundWords(
      round,
      {
        ...result,
        correctIdeophoneId: undefined,
        selectedIdeophoneId: 7,
        correct: true,
      },
      NOW,
    );

    expect(words.find((word) => word.ideophoneId === 7)?.meaning).toBe(
      "clanging, banging",
    );
  });

  it("returns nothing when the correct id is unknowable (never guesses the mapping)", () => {
    const words = extractRoundWords(
      round,
      { ...result, correctIdeophoneId: undefined, correct: false },
      NOW,
    );

    expect(words).toEqual([]);
  });

  it("returns nothing for practice rounds", () => {
    expect(extractRoundWords({ ...round, practice: true }, result, NOW)).toEqual(
      [],
    );
    expect(extractRoundWords(round, { ...result, practice: true }, NOW)).toEqual(
      [],
    );
  });

  it("skips only the other word when translations.other is missing", () => {
    const words = extractRoundWords(
      { ...round, translations: { target: "clanging, banging" } },
      result,
      NOW,
    );

    expect(words.map((word) => word.ideophoneId)).toEqual([7]);
  });

  it("falls back through round fields for the target meaning", () => {
    const words = extractRoundWords(
      { ...round, targetTranslation: "", translations: { other: "rustling" } },
      { ...result, targetTranslation: undefined, prompt: undefined },
      NOW,
    );

    expect(words.find((word) => word.ideophoneId === 7)).toBeUndefined();

    const viaPrompt = extractRoundWords(
      {
        ...round,
        targetTranslation: "",
        prompt: "clanging, banging",
        translations: { other: "rustling" },
      },
      { ...result, targetTranslation: undefined },
      NOW,
    );

    expect(viaPrompt.find((word) => word.ideophoneId === 7)?.meaning).toBe(
      "clanging, banging",
    );
  });
});

describe("addWordsToPool", () => {
  it("appends new words and dedupes by ideophoneId (first encounter wins)", () => {
    const existing = [poolWord({ ideophoneId: 7, meaning: "clanging, banging" })];
    const next = addWordsToPool(existing, [
      poolWord({ ideophoneId: 7, meaning: "different gloss" }),
      poolWord({ ideophoneId: 9 }),
      poolWord({ ideophoneId: 9, meaning: "duplicate in batch" }),
    ]);

    expect(next.map((word) => word.ideophoneId)).toEqual([7, 9]);
    expect(next[0].meaning).toBe("clanging, banging");
    expect(next[1].meaning).toBe("rustling");
  });

  it("returns the same reference when nothing new arrives", () => {
    const existing = [poolWord({ ideophoneId: 7 })];
    expect(addWordsToPool(existing, [poolWord({ ideophoneId: 7 })])).toBe(
      existing,
    );
    expect(addWordsToPool(existing, [])).toBe(existing);
  });
});

describe("parsePool / serializePool", () => {
  it("roundtrips a pool for the same user", () => {
    const words = [poolWord({ ideophoneId: 7 }), poolWord({ ideophoneId: 9 })];
    expect(parsePool(serializePool(words, "nils"), "nils")).toEqual(words);
  });

  it("rejects another user's pool", () => {
    const raw = serializePool([poolWord({})], "nils");
    expect(parsePool(raw, "someone-else")).toEqual([]);
  });

  it("rejects malformed payloads", () => {
    expect(parsePool(null, "nils")).toEqual([]);
    expect(parsePool("not json", "nils")).toEqual([]);
    expect(parsePool("42", "nils")).toEqual([]);
    expect(parsePool(JSON.stringify({ username: "nils" }), "nils")).toEqual([]);
  });

  it("rejects unknown versions", () => {
    const raw = JSON.stringify({
      version: 2,
      username: "nils",
      words: [poolWord({})],
    });
    expect(parsePool(raw, "nils")).toEqual([]);
  });

  it("drops entries missing required fields", () => {
    const raw = JSON.stringify({
      version: 1,
      username: "nils",
      words: [
        poolWord({ ideophoneId: 7 }),
        { ideophoneId: 8 }, // no meaning
        { meaning: "orphan", sessionUuid: "s" }, // no id
      ],
    });
    expect(parsePool(raw, "nils").map((word) => word.ideophoneId)).toEqual([7]);
  });
});

describe("localStorage wrappers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes and reads back through localStorage under the pool key", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    const words = [poolWord({ ideophoneId: 7 })];
    writeRatingPool("nils", words);

    expect(store.has(RATING_POOL_STORAGE_KEY)).toBe(true);
    expect(readRatingPool("nils")).toEqual(words);
    expect(readRatingPool("someone-else")).toEqual([]);
  });

  it("survives storage failures", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {},
    });

    expect(() => writeRatingPool("nils", [poolWord({})])).not.toThrow();
    expect(readRatingPool("nils")).toEqual([]);
  });
});
