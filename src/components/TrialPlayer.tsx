import { useEffect, useRef, useState } from "react";
import { ApiError, submitAnswer } from "../api/client";
import type {
  AnswerResultResponse,
  IdeophoneOption,
  RoundResponse,
  TrialPhase,
} from "../api/types";
import type { SessionStats } from "../App";
import { getConditionPresentation } from "../conditionPresentation";
import {
  CHOICE_QUESTION_PREFIX,
  CHOICE_QUESTION_SUFFIX,
  LISTEN_INSTRUCTION,
  MEANING_OTHER_PREFIX,
  MEANING_TARGET_PREFIX,
} from "../experimentText";
import { getRoundProblem } from "../roundValidation";
import FeedbackPanel from "./FeedbackPanel";
import IdeophoneCard from "./IdeophoneCard";

type TrialPlayerProps = {
  sessionUuid: string;
  round: RoundResponse;
  sessionStats: SessionStats;
  totalRounds: number;
  onNeedNextRound: () => void;
  onBackToStart: () => void;
  onAnswered: (result: AnswerResultResponse) => void;
  onAuthExpired: (message: string) => void;
};

export default function TrialPlayer({
  sessionUuid,
  round,
  sessionStats,
  totalRounds,
  onNeedNextRound,
  onBackToStart,
  onAnswered,
  onAuthExpired,
}: TrialPlayerProps) {
  const [phase, setPhase] = useState<TrialPhase>("fixation");
  const [answerResult, setAnswerResult] =
    useState<AnswerResultResponse | null>(null);
  const [playbackMessage, setPlaybackMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const choiceStartedAtRef = useRef<number | null>(null);
  const roundTokenRef = useRef(0);
  const rightDelayTimeoutRef = useRef<number | null>(null);
  const targetTranslation = getTargetTranslation(round);
  const otherTranslation = round.translations?.other?.trim();
  const roundProblem = getRoundProblem(round, targetTranslation);
  const presentation = getConditionPresentation(round.conditionName);

  useEffect(() => {
    if (roundProblem) {
      return undefined;
    }

    const token = roundTokenRef.current + 1;
    roundTokenRef.current = token;

    const delay = round.timing?.fixationMs ?? 800;
    const timerId = window.setTimeout(() => {
      if (roundTokenRef.current === token) {
        setPhase("left-playing");
      }
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [round.roundId, round.timing?.fixationMs, roundProblem]);

  function handleLeftEnded() {
    setPhase((current) =>
      current === "left-playing" ? "right-playing" : current,
    );
  }

  function handleRightEnded() {
    const preChoiceDelayMs = round.timing?.preChoiceDelayMs ?? 0;

    if (rightDelayTimeoutRef.current !== null) {
      window.clearTimeout(rightDelayTimeoutRef.current);
    }

    rightDelayTimeoutRef.current = window.setTimeout(() => {
      choiceStartedAtRef.current = performance.now();
      setPhase((current) => (current === "right-playing" ? "choice" : current));
    }, preChoiceDelayMs);
  }

  async function handleSelect(option: IdeophoneOption) {
    if (phase !== "choice") {
      return;
    }

    const startedAt = choiceStartedAtRef.current ?? performance.now();
    const responseTimeMs = Math.round(performance.now() - startedAt);
    setPhase("submitting");
    setSubmitError("");

    try {
      const result = await submitAnswer(sessionUuid, {
        roundId: round.roundId,
        selectedIdeophoneId: option.ideophoneId,
        responseTimeMs,
      });
      setAnswerResult(result);
      setPhase("feedback");
      onAnswered(result);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        onAuthExpired(caught.message);
        return;
      }

      setSubmitError(
        caught instanceof Error ? caught.message : "Answer submission failed",
      );
      setPhase("choice");
    }
  }

  function handlePlaybackError(message: string) {
    setPlaybackMessage(message);
  }

  function handleNextTrial() {
    setPhase("loading");
    onNeedNextRound();
  }

  useEffect(
    () => () => {
      if (rightDelayTimeoutRef.current !== null) {
        window.clearTimeout(rightDelayTimeoutRef.current);
      }
    },
    [],
  );

  if (roundProblem) {
    return (
      <section className="trial-stage error-panel" aria-live="polite">
        <h2>Round unavailable</h2>
        <p>{roundProblem}</p>
        <div className="completion-actions">
          <button className="primary-button" type="button" onClick={onNeedNextRound}>
            Try Next Round
          </button>
          <button className="secondary-button" type="button" onClick={onBackToStart}>
            Back to start
          </button>
        </div>
      </section>
    );
  }

  const isFixation = phase === "fixation";
  const isLeftPlaying = phase === "left-playing";
  const isRightPlaying = phase === "right-playing";
  const isChoice = phase === "choice" || phase === "submitting";
  const hasFeedback = phase === "feedback" && answerResult !== null;
  const cardsAreChoices = isChoice;
  const isPractice = round.practice === true;
  const currentRoundNumber = Math.min(
    totalRounds,
    sessionStats.answered + (hasFeedback ? 0 : 1),
  );
  const answeredPercent =
    totalRounds > 0
      ? Math.min(100, Math.round((sessionStats.answered / totalRounds) * 100))
      : 0;
  const leftMeaning = hasFeedback
    ? getPostAnswerMeaning(round, answerResult, round.left, targetTranslation)
    : undefined;
  const rightMeaning = hasFeedback
    ? getPostAnswerMeaning(round, answerResult, round.right, targetTranslation)
    : undefined;
  // One always-mounted status line; messages swap in place so they never
  // change document flow.
  const statusMessage = submitError
    ? submitError
    : playbackMessage
      ? `Sound playback issue: ${playbackMessage}`
      : phase === "submitting"
        ? "Submitting..."
        : phase === "loading"
          ? "Loading next round..."
          : "";

  return (
    <section className="trial-stage" aria-live="polite">
      <div className="trial-progress" aria-label="Session progress">
        {/* Practice rounds replace the round counter and score readout for the
            whole round (header content is constant per round, so invariant 5
            is untouched); the progress track below stays at its pre-game 0%
            because practice answers never increment sessionStats. */}
        <div className="progress-summary">
          {isPractice ? (
            <>
              <strong>Practice round</strong>
              <span className="practice-note">Not scored</span>
            </>
          ) : (
            <>
              <strong>
                Round {currentRoundNumber} / {totalRounds}
              </strong>
              <span>
                Session score: {sessionStats.correct} / {sessionStats.answered}
              </span>
              <span>{answeredPercent}% answered</span>
            </>
          )}
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Answered rounds"
          aria-valuemin={0}
          aria-valuemax={totalRounds}
          aria-valuenow={Math.min(sessionStats.answered, totalRounds)}
        >
          <span style={{ width: `${answeredPercent}%` }} />
        </div>
      </div>

      {/* The full board mounts at fixation with every slot at its final
          reserved size; phases toggle visibility only, never document flow
          (invariant 5 — layout stability is also a timing-validity rule). */}
      <div className="trial-board">
        <div className="trial-copy">
          <p>{LISTEN_INSTRUCTION}</p>
        </div>

        <div className="stimulus-row" aria-label="Ideophone word cards">
          <IdeophoneCard
            autoplayToken={round.roundId * 10 + 1}
            disabled={!isChoice || phase === "submitting"}
            meaning={leftMeaning}
            mediaPlaying={isLeftPlaying}
            mediaVisible={isLeftPlaying || isChoice || hasFeedback}
            mode={cardsAreChoices ? "button" : "display"}
            option={round.left}
            positionLabel="A"
            presentation={presentation}
            revealDetails={hasFeedback}
            visible={isLeftPlaying || isChoice || hasFeedback}
            onEnded={handleLeftEnded}
            onError={handlePlaybackError}
            onSelect={handleSelect}
          />

          <IdeophoneCard
            autoplayToken={round.roundId * 10 + 2}
            disabled={!isChoice || phase === "submitting"}
            meaning={rightMeaning}
            mediaPlaying={isRightPlaying}
            mediaVisible={isRightPlaying || isChoice || hasFeedback}
            mode={cardsAreChoices ? "button" : "display"}
            option={round.right}
            positionLabel="B"
            presentation={presentation}
            revealDetails={hasFeedback}
            visible={isRightPlaying || isChoice || hasFeedback}
            onEnded={handleRightEnded}
            onError={handlePlaybackError}
            onSelect={handleSelect}
          />

          <span
            className={isFixation ? "fixation-cross" : "fixation-cross slot-hidden"}
            aria-hidden="true"
          >
            +
          </span>
        </div>

        <div className="translation-lines" aria-label="Translations">
          <p className="translation-option">
            {MEANING_TARGET_PREFIX}
            <strong>{targetTranslation}</strong>
          </p>
          <p className="translation-option">
            {MEANING_OTHER_PREFIX}
            <strong>{otherTranslation || "an unavailable translation"}</strong>
          </p>
        </div>

        {/* Question and Next-round button share one reserved slot: the
            question shows at choice, the button at feedback, never both. */}
        <div className="question-slot">
          <p className={isChoice ? "question-text" : "question-text slot-hidden"}>
            {CHOICE_QUESTION_PREFIX}
            <strong>{targetTranslation}</strong>
            {CHOICE_QUESTION_SUFFIX}
          </p>
          <button
            className={
              hasFeedback
                ? "primary-button feedback-next-button"
                : "primary-button feedback-next-button slot-hidden"
            }
            type="button"
            disabled={!hasFeedback}
            onClick={handleNextTrial}
          >
            Next round
          </button>
        </div>

        <p
          className={
            submitError ? "status-line error-text centered" : "status-line notice-text"
          }
        >
          {statusMessage}
        </p>
      </div>

      {hasFeedback ? (
        <FeedbackPanel
          result={answerResult}
          round={round}
        />
      ) : null}
    </section>
  );
}

function getTargetTranslation(round: RoundResponse) {
  return (
    round.targetTranslation ??
    round.prompt ??
    round.translations?.target ??
    ""
  ).trim();
}

function getPostAnswerMeaning(
  round: RoundResponse,
  result: AnswerResultResponse,
  option: IdeophoneOption,
  targetTranslation: string,
) {
  const correctIdeophoneId =
    result.correctIdeophoneId ??
    (result.correct ? result.selectedIdeophoneId : undefined);
  if (correctIdeophoneId && option.ideophoneId === correctIdeophoneId) {
    return result.targetTranslation ?? result.prompt ?? targetTranslation;
  }

  if (option.ideophoneId === result.selectedIdeophoneId && result.correct) {
    return result.targetTranslation ?? result.prompt ?? targetTranslation;
  }

  return round.translations?.other ?? "Meaning not provided";
}
