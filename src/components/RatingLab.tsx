import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  getAllMyRatings,
  getDivergence,
  submitRating,
} from "../api/client";
import type {
  DivergenceEntry,
  RatingRequest,
  RatingResponse,
} from "../api/types";
import {
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
} from "../experimentText";
import { buildLabRecordRows, type LabRecordRow } from "../labRecord";
import type { RatingPoolWord } from "../ratingPool";
import { resolveStimulusSource } from "../stimulusMedia";
import StimulusPlayback from "./StimulusPlayback";

// The 1-7 resemblance scale of the thesis Rating Task. Values are fixed by
// the instrument; the frozen copy in experimentText.ts names the endpoints.
const SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7];
const MAX_RESPONSE_TIME_MS = 600000;

type RatingLabProps = {
  pool: RatingPoolWord[];
  onAuthExpired: (message: string) => void;
  onBackToHome: () => void;
  onGoToChoosing: () => void;
};

type RatingLabPhase =
  | "loading"
  | "instructions"
  | "rating"
  | "submitting"
  | "revealed"
  | "done"
  | "empty"
  | "error";

export type RatingRevealData = {
  yourRating: number | null;
  alreadyRated: boolean;
  recordFailed: boolean;
  divergence: DivergenceEntry | null;
};

export default function RatingLab({
  pool,
  onAuthExpired,
  onBackToHome,
  onGoToChoosing,
}: RatingLabProps) {
  const [phase, setPhase] = useState<RatingLabPhase>("loading");
  const [queue, setQueue] = useState<RatingPoolWord[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RatingRevealData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [replayToken, setReplayToken] = useState(0);
  const [existingRatings, setExistingRatings] = useState<
    Map<number, RatingResponse>
  >(new Map());
  const [divergenceMap, setDivergenceMap] = useState<Map<
    number,
    DivergenceEntry
  > | null>(null);
  const [loadToken, setLoadToken] = useState(0);
  const trialStartRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setPhase("loading");
      setLoadError("");

      // Divergence is public and optional: its failure never blocks rating.
      const divergencePromise = getDivergence()
        .then((rows) => toDivergenceMap(rows))
        .catch(() => null);

      let ratings: RatingResponse[];
      try {
        ratings = await getAllMyRatings();
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }
        if (isMounted) {
          setLoadError(
            caught instanceof Error
              ? caught.message
              : "Your ratings failed to load",
          );
          setPhase("error");
        }
        return;
      }

      const divergence = await divergencePromise;
      if (!isMounted) {
        return;
      }

      const ratingsMap = new Map(
        ratings.map((entry) => [entry.ideophoneId, entry]),
      );
      const unrated = pool.filter((word) => !ratingsMap.has(word.ideophoneId));

      setExistingRatings(ratingsMap);
      setDivergenceMap(divergence);
      setQueue(unrated);
      setIndex(0);
      setSelectedRating(null);
      setReveal(null);
      setStatusMessage("");

      if (pool.length === 0 && ratingsMap.size === 0) {
        setPhase("empty");
      } else if (unrated.length === 0) {
        setPhase("done");
      } else {
        setPhase("instructions");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [pool, onAuthExpired, loadToken]);

  function startWord(nextIndex: number) {
    setIndex(nextIndex);
    setSelectedRating(null);
    setReveal(null);
    setStatusMessage("");
    setReplayToken((token) => token + 1);
    trialStartRef.current = performance.now();
    setPhase("rating");
  }

  function handleBegin() {
    startWord(0);
  }

  function handleReplay() {
    setReplayToken((token) => token + 1);
  }

  function handleSelectRating(value: number) {
    if (phase !== "rating") {
      return;
    }
    setSelectedRating(value);
  }

  function finishWord(word: RatingPoolWord, data: RatingRevealData) {
    setReveal({
      ...data,
      divergence: data.divergence ?? divergenceMap?.get(word.ideophoneId) ?? null,
    });
    setPhase("revealed");

    // Refresh the arena record so the reveal's mean includes this rating.
    void getDivergence()
      .then((rows) => {
        const refreshed = toDivergenceMap(rows);
        setDivergenceMap(refreshed);
        setReveal((current) =>
          current
            ? {
                ...current,
                divergence:
                  refreshed.get(word.ideophoneId) ?? current.divergence,
              }
            : current,
        );
      })
      .catch(() => undefined);
  }

  async function handleSubmit() {
    const word = queue[index];
    if (phase !== "rating" || selectedRating === null || !word) {
      return;
    }

    const startedAt = trialStartRef.current ?? performance.now();
    const responseTimeMs = Math.min(
      MAX_RESPONSE_TIME_MS,
      Math.max(0, Math.round(performance.now() - startedAt)),
    );

    setPhase("submitting");
    setStatusMessage("");

    const request: RatingRequest = {
      ideophoneId: word.ideophoneId,
      rating: selectedRating,
      responseTimeMs,
      sessionUuid: word.sessionUuid,
    };

    try {
      const response = await submitRatingWithSessionFallback(request);
      setExistingRatings((current) =>
        new Map(current).set(word.ideophoneId, response),
      );
      finishWord(word, {
        yourRating: response.rating,
        alreadyRated: false,
        recordFailed: false,
        divergence: null,
      });
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        setStatusMessage(
          caught instanceof Error ? caught.message : "Rating failed to submit",
        );
        setPhase("rating");
        return;
      }

      if (caught.status === 401) {
        onAuthExpired(caught.message);
        return;
      }

      if (caught.status === 409) {
        // Not an upsert: one rating per (player, word). Recover the stored
        // value so the reveal can show it.
        const stored = await getAllMyRatings()
          .then(
            (entries) =>
              entries.find((entry) => entry.ideophoneId === word.ideophoneId) ??
              null,
          )
          .catch(() => null);
        if (stored) {
          setExistingRatings((current) =>
            new Map(current).set(word.ideophoneId, stored),
          );
        }
        finishWord(word, {
          yourRating: stored?.rating ?? null,
          alreadyRated: true,
          recordFailed: false,
          divergence: null,
        });
        return;
      }

      if (caught.status === 403) {
        onAuthExpired(caught.message);
        return;
      }

      if (caught.status === 404) {
        // The word no longer exists backend-side (e.g. a dev database reset).
        // Reveal without a record instead of trapping the player on it.
        finishWord(word, {
          yourRating: null,
          alreadyRated: false,
          recordFailed: true,
          divergence: null,
        });
        return;
      }

      setStatusMessage(caught.message || "Rating failed to submit");
      setPhase("rating");
    }
  }

  function handleNext() {
    if (phase !== "revealed") {
      return;
    }

    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      startWord(nextIndex);
    } else {
      setPhase("done");
    }
  }

  function handlePlaybackError(message: string) {
    setStatusMessage(`Sound playback issue: ${message}`);
  }

  if (phase === "loading") {
    return <p className="status-text">Opening the Rating Lab...</p>;
  }

  if (phase === "error") {
    return (
      <section className="rating-lab error-panel" aria-live="polite">
        <h1>Rating Lab</h1>
        <p className="error-text centered">{loadError}</p>
        <div className="completion-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => setLoadToken((token) => token + 1)}
          >
            Try again
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onBackToHome}
          >
            Back to modes
          </button>
        </div>
      </section>
    );
  }

  if (phase === "empty") {
    return <RatingEmptyState onBackToHome={onBackToHome} onGoToChoosing={onGoToChoosing} />;
  }

  if (phase === "instructions") {
    return (
      <RatingInstructionsPanel
        alreadyRatedCount={countRatedPoolWords(pool, existingRatings)}
        wordCount={queue.length}
        onBack={onBackToHome}
        onBegin={handleBegin}
      />
    );
  }

  if (phase === "done") {
    return (
      <RatingDonePanel
        hasQueueRun={queue.length > 0}
        rows={buildLabRecordRows(existingRatings, divergenceMap, pool)}
        onBackToHome={onBackToHome}
      />
    );
  }

  const word = queue[index];
  if (!word) {
    // Defensive: the queue emptied out from under the trial phases.
    return <RatingEmptyState onBackToHome={onBackToHome} onGoToChoosing={onGoToChoosing} />;
  }

  return (
    <RatingTrialPanel
      index={index}
      phase={phase}
      replayToken={replayToken}
      reveal={reveal}
      selectedRating={selectedRating}
      statusMessage={statusMessage}
      total={queue.length}
      word={word}
      onNext={handleNext}
      onPlaybackError={handlePlaybackError}
      onReplay={handleReplay}
      onSelectRating={handleSelectRating}
      onSubmit={() => void handleSubmit()}
    />
  );
}

type RatingInstructionsPanelProps = {
  wordCount: number;
  alreadyRatedCount: number;
  onBegin: () => void;
  onBack: () => void;
};

// Pure render of the frozen Rating Task instructions (Gorilla-adapted:
// dynamic word count, fixed time estimate dropped). Bold spans follow the
// Gorilla screenshot: 1, 7, and both anchor phrases; the count stays plain.
export function RatingInstructionsPanel({
  wordCount,
  alreadyRatedCount,
  onBegin,
  onBack,
}: RatingInstructionsPanelProps) {
  return (
    <section className="rating-lab instructions" aria-labelledby="rating-lab-title">
      <h1 id="rating-lab-title">Rating Lab</h1>

      <button
        className="secondary-button instructions-back"
        type="button"
        onClick={onBack}
      >
        Back to modes
      </button>

      <p className="rating-intro">
        {RATING_INTRO_PREFIX}
        {wordCount}
        {RATING_INTRO_AFTER_COUNT}
        <strong>{RATING_SCALE_MIN}</strong>
        {RATING_INTRO_TO}
        <strong>{RATING_SCALE_MAX}</strong>
        {RATING_SENTENCE_END}
      </p>

      <p className="rating-intro-anchors">
        <strong>{RATING_SCALE_MIN}</strong>
        {RATING_INDICATES}
        <strong>{RATING_ANCHOR_LOW_INLINE}</strong>
        {RATING_WHILE}
        <strong>{RATING_SCALE_MAX}</strong>
        {RATING_INDICATES}
        <strong>{RATING_ANCHOR_HIGH_INLINE}</strong>
        {RATING_SENTENCE_END}
      </p>

      <p>{RATING_HOW_TO}</p>

      {alreadyRatedCount > 0 ? (
        <p className="muted">
          Your lab record already holds {alreadyRatedCount}{" "}
          {alreadyRatedCount === 1 ? "word" : "words"} you rated earlier.
        </p>
      ) : null}

      <button className="primary-button" type="button" onClick={onBegin}>
        Start rating
      </button>
    </section>
  );
}

export type RatingTrialPanelProps = {
  word: RatingPoolWord;
  index: number;
  total: number;
  phase: "rating" | "submitting" | "revealed";
  selectedRating: number | null;
  reveal: RatingRevealData | null;
  statusMessage: string;
  replayToken: number;
  onSelectRating: (rating: number) => void;
  onReplay: () => void;
  onSubmit: () => void;
  onNext: () => void;
  onPlaybackError: (message: string) => void;
};

// One word's rating screen, mirroring the Gorilla Rating Task layout. The
// stimulus stays audio-only: no script, no romaji until the lab record. Every
// slot (reveal, status line, Next) is mounted from the start and toggles
// visibility only — no mid-trial layout shift.
export function RatingTrialPanel({
  word,
  index,
  total,
  phase,
  selectedRating,
  reveal,
  statusMessage,
  replayToken,
  onSelectRating,
  onReplay,
  onSubmit,
  onNext,
  onPlaybackError,
}: RatingTrialPanelProps) {
  const isRevealed = phase === "revealed";
  const isSubmitting = phase === "submitting";
  const nextDisabled = isSubmitting || (!isRevealed && selectedRating === null);

  return (
    <section className="rating-lab rating-trial" aria-label="Rating trial">
      <p className="rating-progress">
        Word {index + 1} of {total}
      </p>

      <div className="rating-trial-copy">
        <p>{RATING_LISTEN_LINE_1}</p>
        <p>{RATING_LISTEN_LINE_2}</p>
      </div>

      <button
        className="secondary-button rating-replay-button"
        disabled={isSubmitting}
        type="button"
        onClick={onReplay}
      >
        {RATING_REPLAY_BUTTON}
      </button>

      <div className="rating-stimulus-card">
        <span className="rating-stimulus-glyph" aria-hidden="true">
          ▽
        </span>
        <StimulusPlayback
          autoplayToken={replayToken}
          playing
          src={resolveStimulusSource(word)}
          onError={onPlaybackError}
        />
      </div>

      <p className="rating-meaning-line">
        {RATING_MEANING_PREFIX}
        <strong>{word.meaning}</strong>
      </p>

      <p className="rating-question" id="rating-question">
        {RATING_QUESTION}
      </p>

      <div
        aria-labelledby="rating-question"
        className="rating-scale"
        role="group"
      >
        <span className="rating-scale-anchor">{RATING_SCALE_LOW_LABEL}</span>
        <div className="rating-scale-row">
          {SCALE_VALUES.map((value) => {
            const isSelected = selectedRating === value;
            return (
              <button
                aria-pressed={isSelected}
                className={
                  isSelected
                    ? "rating-scale-button selected"
                    : "rating-scale-button"
                }
                disabled={phase !== "rating"}
                key={value}
                type="button"
                onClick={() => onSelectRating(value)}
              >
                {value}
              </button>
            );
          })}
        </div>
        <span className="rating-scale-anchor">{RATING_SCALE_HIGH_LABEL}</span>
      </div>

      <button
        className="primary-button rating-next-button"
        disabled={nextDisabled}
        type="button"
        onClick={isRevealed ? onNext : onSubmit}
      >
        {RATING_NEXT_BUTTON}
      </button>

      <p
        className={
          statusMessage.startsWith("Sound playback issue")
            ? "status-line notice-text"
            : statusMessage
              ? "status-line error-text centered"
              : "status-line notice-text"
        }
      >
        {isSubmitting ? "Submitting..." : statusMessage}
      </p>

      <div
        aria-live="polite"
        className={reveal ? "rating-reveal" : "rating-reveal slot-hidden"}
      >
        {reveal ? <RatingRevealContent reveal={reveal} /> : null}
      </div>
    </section>
  );
}

type RatingRevealContentProps = {
  reveal: RatingRevealData;
};

// Post-submit arena record. Framing stays descriptive (invariant 9): counts
// and averages only, never claims that presentation or script helps anyone
// guess.
export function RatingRevealContent({ reveal }: RatingRevealContentProps) {
  const { divergence } = reveal;

  return (
    <>
      <p className="rating-reveal-label">Arena record</p>

      {reveal.alreadyRated ? (
        <p>You had already rated this word{reveal.yourRating !== null ? ` — your rating stands at ${reveal.yourRating}` : ""}.</p>
      ) : reveal.recordFailed ? (
        <p>This word could not be recorded right now, so the arena moves on.</p>
      ) : (
        <p>
          Your rating: <strong>{reveal.yourRating}</strong>
        </p>
      )}

      {divergence ? (
        <>
          <p>
            {divergence.guessAccuracy !== null
              ? `Players guessed this word correctly ${formatPercent(divergence.guessAccuracy)} of the time (${formatCount(divergence.guessCount, "guess", "guesses")}).`
              : "No guesses recorded for this word yet."}
          </p>
          <p>
            {divergence.meanRating !== null
              ? `Mean resemblance rating: ${divergence.meanRating.toFixed(1)} (${formatCount(divergence.ratingCount, "rating", "ratings")}).`
              : "No other ratings recorded for this word yet."}
          </p>
        </>
      ) : (
        <p>Arena record unavailable.</p>
      )}
    </>
  );
}

type LabRecordPanelProps = {
  rows: LabRecordRow[];
};

// The player's cumulative lab record: every word they have rated, alongside
// the arena's aggregate guesses and ratings for the same word.
export function LabRecordPanel({ rows }: LabRecordPanelProps) {
  return (
    <div className="rating-record">
      <h2>Lab record</h2>
      {rows.length > 0 ? (
        <div className="rating-record-scroll">
          <table className="rating-record-table">
            <thead>
              <tr>
                <th>Word</th>
                <th>Meaning</th>
                <th>Your rating</th>
                <th>Mean rating</th>
                <th>Guess accuracy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ideophoneId}>
                  <td>{row.romaji}</td>
                  <td>{row.gloss}</td>
                  <td>{row.yourRating}</td>
                  <td>
                    {row.meanRating !== null
                      ? `${row.meanRating.toFixed(1)} (${formatCount(row.ratingCount, "rating", "ratings")})`
                      : "—"}
                  </td>
                  <td>
                    {row.guessAccuracy !== null
                      ? `${formatPercent(row.guessAccuracy)} (${formatCount(row.guessCount, "guess", "guesses")})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No rated words yet.</p>
      )}
    </div>
  );
}

type RatingDonePanelProps = {
  hasQueueRun: boolean;
  rows: LabRecordRow[];
  onBackToHome: () => void;
};

export function RatingDonePanel({
  hasQueueRun,
  rows,
  onBackToHome,
}: RatingDonePanelProps) {
  return (
    <section className="complete-panel rating-done" aria-labelledby="rating-done-title">
      <h1 id="rating-done-title">Rating Lab</h1>
      <p>
        {hasQueueRun
          ? "That is every word you have encountered so far. New words join the lab whenever you play the Choosing Task."
          : "You have rated every word you have encountered so far. New words join the lab whenever you play the Choosing Task."}
      </p>

      <LabRecordPanel rows={rows} />

      <div className="completion-actions">
        <button className="secondary-button" type="button" onClick={onBackToHome}>
          Back to modes
        </button>
      </div>
    </section>
  );
}

type RatingEmptyStateProps = {
  onBackToHome: () => void;
  onGoToChoosing: () => void;
};

export function RatingEmptyState({
  onBackToHome,
  onGoToChoosing,
}: RatingEmptyStateProps) {
  return (
    <section className="complete-panel rating-empty" aria-labelledby="rating-empty-title">
      <h1 id="rating-empty-title">Rating Lab</h1>
      <p>
        The Rating Lab works with words you have already met. Play the Choosing
        Task first — every word you hear there becomes available to rate.
      </p>

      <div className="completion-actions">
        <button className="primary-button" type="button" onClick={onGoToChoosing}>
          Go to the Choosing Task
        </button>
        <button className="secondary-button" type="button" onClick={onBackToHome}>
          Back to modes
        </button>
      </div>
    </section>
  );
}

// Session linkage is provenance only; a stale sessionUuid (e.g. after a
// backend database reset) should not block the rating itself, so retry once
// without it when the backend rejects the session reference.
async function submitRatingWithSessionFallback(request: RatingRequest) {
  try {
    return await submitRating(request);
  } catch (caught) {
    if (
      request.sessionUuid &&
      caught instanceof ApiError &&
      [403, 404].includes(caught.status) &&
      /session/i.test(caught.message)
    ) {
      return submitRating({
        ideophoneId: request.ideophoneId,
        rating: request.rating,
        responseTimeMs: request.responseTimeMs,
      });
    }
    throw caught;
  }
}

function countRatedPoolWords(
  pool: RatingPoolWord[],
  ratings: Map<number, RatingResponse>,
) {
  return pool.filter((word) => ratings.has(word.ideophoneId)).length;
}

function toDivergenceMap(rows: DivergenceEntry[]) {
  return new Map(rows.map((row) => [row.ideophoneId, row]));
}

function formatPercent(fraction: number) {
  return `${Math.round(fraction * 100)}%`;
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
