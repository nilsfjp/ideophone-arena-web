import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DivergenceEntry, RatingResponse } from "../api/types";
import {
  RATING_HOW_TO,
  RATING_INTRO_AFTER_COUNT,
  RATING_INTRO_PREFIX,
  RATING_LISTEN_LINE_1,
  RATING_LISTEN_LINE_2,
  RATING_MEANING_PREFIX,
  RATING_QUESTION,
  RATING_SCALE_HIGH_LABEL,
  RATING_SCALE_LOW_LABEL,
} from "../experimentText";
import { buildLabRecordRows } from "../labRecord";
import type { RatingPoolWord } from "../ratingPool";
import {
  LabRecordPanel,
  RatingEmptyState,
  RatingInstructionsPanel,
  RatingRevealContent,
  RatingTrialPanel,
  type RatingRevealData,
  type RatingTrialPanelProps,
} from "./RatingLab";

// Shaped like the ratable-words endpoint entries: no session provenance, no
// timestamps — the backend owns encounter order now.
const word: RatingPoolWord = {
  ideophoneId: 7,
  canonicalForm: "カンカン",
  romaji: "kankan",
  stimulusFile: "audio/a0a-kankan.m4a",
  modality: "AUDITORY",
  meaning: "clanging, banging",
};

const divergenceEntry: DivergenceEntry = {
  ideophoneId: 7,
  romaji: "kankan",
  gloss: "clanging, banging",
  modality: "AUDITORY",
  guessAccuracy: 0.72,
  guessCount: 25,
  meanRating: 6,
  ratingCount: 4,
};

function countOccurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

function renderTrial(overrides: Partial<RatingTrialPanelProps> = {}) {
  return renderToStaticMarkup(
    <RatingTrialPanel
      index={0}
      phase="rating"
      replayToken={1}
      reveal={null}
      selectedRating={null}
      statusMessage=""
      total={12}
      word={word}
      onNext={() => {}}
      onPlaybackError={() => {}}
      onReplay={() => {}}
      onSelectRating={() => {}}
      onSubmit={() => {}}
      {...overrides}
    />,
  );
}

describe("RatingInstructionsPanel", () => {
  it("renders the frozen Gorilla-adapted instructions with a dynamic count", () => {
    const markup = renderToStaticMarkup(
      <RatingInstructionsPanel
        alreadyRatedCount={0}
        wordCount={12}
        onBack={() => {}}
        onBegin={() => {}}
      />,
    );

    expect(markup).toContain(`${RATING_INTRO_PREFIX}12${RATING_INTRO_AFTER_COUNT}`);
    expect(markup).toContain(
      "<strong>1</strong> to <strong>7</strong>.",
    );
    expect(markup).toContain(
      "<strong>1</strong> indicates <strong>no resemblance</strong> while <strong>7</strong> indicates <strong>strong resemblance</strong>.",
    );
    expect(
      countOccurrences(markup, RATING_HOW_TO.replaceAll("'", "&#x27;")),
    ).toBe(1);
  });

  it("mentions earlier ratings only when some exist", () => {
    const withNote = renderToStaticMarkup(
      <RatingInstructionsPanel
        alreadyRatedCount={3}
        wordCount={9}
        onBack={() => {}}
        onBegin={() => {}}
      />,
    );
    const withoutNote = renderToStaticMarkup(
      <RatingInstructionsPanel
        alreadyRatedCount={0}
        wordCount={9}
        onBack={() => {}}
        onBegin={() => {}}
      />,
    );

    expect(withNote).toContain("3 words you rated earlier");
    expect(withoutNote).not.toContain("rated earlier");
  });
});

describe("RatingTrialPanel", () => {
  it("renders each frozen trial string exactly once", () => {
    const markup = renderTrial();

    expect(countOccurrences(markup, RATING_LISTEN_LINE_1)).toBe(1);
    expect(countOccurrences(markup, RATING_LISTEN_LINE_2)).toBe(1);
    expect(
      countOccurrences(
        markup,
        `${RATING_MEANING_PREFIX}<strong>clanging, banging</strong>`,
      ),
    ).toBe(1);
    expect(countOccurrences(markup, RATING_QUESTION)).toBe(1);
    expect(countOccurrences(markup, RATING_SCALE_LOW_LABEL)).toBe(1);
    expect(countOccurrences(markup, RATING_SCALE_HIGH_LABEL)).toBe(1);
  });

  it("keeps the stimulus audio-only: no script, no romaji before the lab record", () => {
    const markup = renderTrial();

    expect(markup).not.toContain("カンカン");
    expect(markup).not.toContain("kankan");
  });

  it("renders exactly seven scale buttons and marks only the selection pressed", () => {
    const markup = renderTrial({ selectedRating: 4 });

    expect(countOccurrences(markup, "rating-scale-button")).toBe(7);
    expect(countOccurrences(markup, 'aria-pressed="true"')).toBe(1);

    const pressedChunk = markup
      .split("<button")
      .find((chunk) => chunk.includes('aria-pressed="true"'));
    expect(pressedChunk).toBeDefined();
    expect(pressedChunk).toContain("selected");
    expect(pressedChunk).toContain(">4</button>");
  });

  it("disables Next until a rating is selected", () => {
    const withoutSelection = renderTrial();
    const withSelection = renderTrial({ selectedRating: 4 });

    const nextChunk = (markup: string) =>
      markup
        .split("<button")
        .find((chunk) => chunk.includes("rating-next-button"));

    expect(nextChunk(withoutSelection)).toContain("disabled");
    expect(nextChunk(withSelection)).not.toContain("disabled");
  });

  it("disables everything and shows the status line while submitting", () => {
    const markup = renderTrial({ phase: "submitting", selectedRating: 4 });

    const buttons = markup
      .split("<button")
      .slice(1)
      .filter(
        (chunk) =>
          chunk.includes("rating-scale-button") ||
          chunk.includes("rating-next-button") ||
          chunk.includes("rating-replay-button"),
      );
    expect(buttons).toHaveLength(9);
    for (const chunk of buttons) {
      expect(chunk).toContain("disabled");
    }
    expect(markup).toContain("Submitting...");
  });

  it("reserves the reveal slot before feedback and fills it after", () => {
    const before = renderTrial();
    const reveal: RatingRevealData = {
      yourRating: 4,
      alreadyRated: false,
      recordFailed: false,
      divergence: divergenceEntry,
    };
    const after = renderTrial({ phase: "revealed", reveal, selectedRating: 4 });

    expect(countOccurrences(before, "rating-reveal")).toBeGreaterThan(0);
    expect(before).toContain("rating-reveal slot-hidden");
    expect(after).not.toContain("rating-reveal slot-hidden");
    expect(after).toContain("Arena record");
    expect(after).toContain(
      "Players guessed this word correctly 72% of the time (25 guesses).",
    );
    expect(after).toContain("Mean resemblance rating: 6.0 (4 ratings).");
    expect(after).toContain("Your rating: <strong>4</strong>");
  });

  it("keeps the selected number filled after reveal", () => {
    const reveal: RatingRevealData = {
      yourRating: 4,
      alreadyRated: false,
      recordFailed: false,
      divergence: null,
    };
    const markup = renderTrial({ phase: "revealed", reveal, selectedRating: 4 });

    const pressedChunk = markup
      .split("<button")
      .find((chunk) => chunk.includes('aria-pressed="true"'));
    expect(pressedChunk).toContain("selected");
    expect(pressedChunk).toContain("disabled");
  });
});

describe("RatingRevealContent", () => {
  it("distinguishes zero-n aggregates from real zeros", () => {
    const markup = renderToStaticMarkup(
      <RatingRevealContent
        reveal={{
          yourRating: 2,
          alreadyRated: false,
          recordFailed: false,
          divergence: {
            ...divergenceEntry,
            guessAccuracy: null,
            guessCount: 0,
            meanRating: null,
            ratingCount: 0,
          },
        }}
      />,
    );

    expect(markup).toContain("No guesses recorded for this word yet.");
    expect(markup).toContain("No other ratings recorded for this word yet.");
    expect(markup).not.toContain("0%");
  });

  it("handles an unavailable record and an already-rated word", () => {
    const unavailable = renderToStaticMarkup(
      <RatingRevealContent
        reveal={{
          yourRating: 5,
          alreadyRated: false,
          recordFailed: false,
          divergence: null,
        }}
      />,
    );
    const alreadyRated = renderToStaticMarkup(
      <RatingRevealContent
        reveal={{
          yourRating: 6,
          alreadyRated: true,
          recordFailed: false,
          divergence: divergenceEntry,
        }}
      />,
    );

    expect(unavailable).toContain("Arena record unavailable.");
    expect(alreadyRated).toContain("You had already rated this word");
    expect(alreadyRated).toContain("your rating stands at 6");
  });
});

describe("buildLabRecordRows", () => {
  const rating: RatingResponse = {
    id: 1,
    ideophoneId: 7,
    rating: 5,
    ratedAt: "2026-07-02T12:00:00Z",
  };

  it("joins ratings with divergence rows", () => {
    const rows = buildLabRecordRows(
      new Map([[7, rating]]),
      new Map([[7, divergenceEntry]]),
      [word],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      romaji: "kankan",
      gloss: "clanging, banging",
      yourRating: 5,
      meanRating: 6,
      guessAccuracy: 0.72,
    });
  });

  it("falls back to pool data when the divergence row is missing", () => {
    const rows = buildLabRecordRows(new Map([[7, rating]]), new Map(), [word]);

    expect(rows[0].romaji).toBe("kankan");
    expect(rows[0].gloss).toBe("clanging, banging");
    expect(rows[0].meanRating).toBeNull();
    expect(rows[0].guessAccuracy).toBeNull();
  });

  it("labels a rating with no pool or divergence data by its id", () => {
    const rows = buildLabRecordRows(new Map([[9, { ...rating, ideophoneId: 9 }]]), null, []);

    expect(rows[0].romaji).toBe("word #9");
    expect(rows[0].gloss).toBe("");
  });

  // NIL-65 rider: a word rated in an earlier visit has left the pool, so when
  // divergence is unavailable the remembered word-meta cache is the only source
  // of its romaji/gloss — the fallback must fire instead of "word #id".
  it("falls back to remembered word metadata when pool and divergence are absent", () => {
    const rows = buildLabRecordRows(
      new Map([[9, { ...rating, ideophoneId: 9 }]]),
      null,
      [],
      new Map([[9, { romaji: "pikapika", gloss: "sparkling" }]]),
    );

    expect(rows[0].romaji).toBe("pikapika");
    expect(rows[0].gloss).toBe("sparkling");
  });
});

describe("LabRecordPanel and RatingEmptyState", () => {
  it("renders the record table with null-safe aggregate cells", () => {
    const rows = buildLabRecordRows(
      new Map([[7, { id: 1, ideophoneId: 7, rating: 5, ratedAt: "" }]]),
      new Map(),
      [word],
    );
    const markup = renderToStaticMarkup(<LabRecordPanel rows={rows} />);

    expect(markup).toContain("Lab record");
    expect(markup).toContain("<th>Your rating</th>");
    expect(markup).toContain("kankan");
    expect(countOccurrences(markup, "—")).toBe(2);
  });

  it("shows the empty message when nothing has been rated", () => {
    const markup = renderToStaticMarkup(<LabRecordPanel rows={[]} />);
    expect(markup).toContain("No rated words yet.");
  });

  it("points an empty lab at Meaning Match", () => {
    const markup = renderToStaticMarkup(
      <RatingEmptyState onBackToHome={() => {}} onGoToChoosing={() => {}} />,
    );

    expect(markup).toContain("words you have already met");
    expect(markup).toContain("Go to Meaning Match");
  });
});
