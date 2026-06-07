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
  const currentRoundNumber = Math.min(
    totalRounds,
    sessionStats.answered + (hasFeedback ? 0 : 1),
  );
  const answeredPercent =
    totalRounds > 0
      ? Math.min(100, Math.round((sessionStats.answered / totalRounds) * 100))
      : 0;

  return (
    <section className="trial-stage" aria-live="polite">
      <div className="trial-progress" aria-label="Session progress">
        <div className="progress-summary">
          <strong>
            Round {currentRoundNumber} / {totalRounds}
          </strong>
          <span>
            Session score: {sessionStats.correct} / {sessionStats.answered}
          </span>
          <span>{answeredPercent}% answered</span>
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

      <div className="trial-copy">
        <p>Listen to these two Japanese words.</p>
        <p className="small-copy">
          {isChoice
            ? "Click a stimulus to select it."
            : hasFeedback
              ? "Feedback recorded. Review it before continuing."
              : phase === "loading"
                ? "Loading the next backend round."
                : "Watch or listen to both before choosing."}
        </p>
      </div>

      <div
        className={isFixation ? "stimulus-row fixation-row" : "stimulus-row"}
        aria-label="Ideophone stimuli"
      >
        {isFixation ? (
          <span className="fixation-cross">+</span>
        ) : (
          <>
            <IdeophoneCard
              autoplayToken={round.roundId * 10 + 1}
              disabled={!isChoice || phase === "submitting"}
              mediaPlaying={isLeftPlaying}
              mediaVisible={isLeftPlaying || isChoice || hasFeedback}
              mode={cardsAreChoices ? "button" : "display"}
              option={round.left}
              positionLabel="A"
              presentation={presentation}
              visible={isLeftPlaying || isChoice || hasFeedback}
              onEnded={handleLeftEnded}
              onError={handlePlaybackError}
              onSelect={handleSelect}
            />

            <IdeophoneCard
              autoplayToken={round.roundId * 10 + 2}
              disabled={!isChoice || phase === "submitting"}
              mediaPlaying={isRightPlaying}
              mediaVisible={isRightPlaying || isChoice || hasFeedback}
              mode={cardsAreChoices ? "button" : "display"}
              option={round.right}
              positionLabel="B"
              presentation={presentation}
              visible={isRightPlaying || isChoice || hasFeedback}
              onEnded={handleRightEnded}
              onError={handlePlaybackError}
              onSelect={handleSelect}
            />
          </>
        )}
      </div>

      <div className="translation-lines" aria-label="Translations">
        <p className="translation-option">
          One of them means <strong>{targetTranslation}</strong>
        </p>
        <p className="translation-option">
          The other means{" "}
          <strong>{otherTranslation || "an unavailable translation"}</strong>
        </p>
      </div>

      {playbackMessage ? (
        <p className="notice-text">
          Stimulus playback issue: {playbackMessage}
        </p>
      ) : null}

      {isChoice ? (
        <p className="question-text">
          Which stimulus means <strong>{targetTranslation}?</strong>
        </p>
      ) : null}

      {phase === "submitting" ? <p className="notice-text">Submitting...</p> : null}
      {phase === "loading" ? (
        <p className="notice-text">Loading next round...</p>
      ) : null}
      {submitError ? <p className="error-text centered">{submitError}</p> : null}
      {hasFeedback ? (
        <>
          <FeedbackPanel
            result={answerResult}
            round={round}
            sessionStats={sessionStats}
          />
          <button
            className="primary-button feedback-next-button"
            type="button"
            onClick={handleNextTrial}
          >
            Next trial
          </button>
        </>
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

function getRoundProblem(round: RoundResponse, targetTranslation: string) {
  if (!round.roundId) {
    return "The backend returned a round without a valid roundId.";
  }

  if (!targetTranslation) {
    return "The backend returned a round without targetTranslation.";
  }

  if (!round.left?.ideophoneId || !round.right?.ideophoneId) {
    return "The backend returned a round without two valid ideophone choices.";
  }

  return "";
}
