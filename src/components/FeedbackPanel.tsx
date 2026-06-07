import type { AnswerResultResponse, RoundResponse } from "../api/types";
import type { SessionStats } from "../App";
import { getResearchFlavorNote } from "../researchFlavor";

type FeedbackPanelProps = {
  result: AnswerResultResponse;
  round: RoundResponse;
  sessionStats: SessionStats;
};

export default function FeedbackPanel({
  result,
  round,
  sessionStats,
}: FeedbackPanelProps) {
  const sessionAccuracy =
    sessionStats.answered > 0
      ? Math.round((sessionStats.correct / sessionStats.answered) * 100)
      : 0;
  const accountAccuracy =
    result.totalAnswered > 0
      ? Math.round((result.totalCorrect / result.totalAnswered) * 100)
      : 0;
  const researchNote = getResearchFlavorNote(round, result);

  return (
    <section
      className={result.correct ? "feedback correct" : "feedback incorrect"}
      aria-live="polite"
    >
      <h2>{result.correct ? "Correct" : "Incorrect"}</h2>

      <dl className="feedback-grid">
        {result.selectedKana ? (
          <>
            <dt>Selected</dt>
            <dd>{result.selectedKana}</dd>
          </>
        ) : null}

        {result.correctKana ? (
          <>
            <dt>Correct</dt>
            <dd>{result.correctKana}</dd>
          </>
        ) : null}

        <dt>Session score</dt>
        <dd>
          {sessionStats.correct} / {sessionStats.answered} ({sessionAccuracy}%)
        </dd>

        <dt>Account total</dt>
        <dd>
          {result.totalCorrect} / {result.totalAnswered} ({accountAccuracy}%)
        </dd>
      </dl>

      <aside className="research-note" aria-label={researchNote.label}>
        <strong>{researchNote.label}</strong>
        <span>{researchNote.text}</span>
      </aside>

      <p className="notice-text">Use Next trial when you are ready to continue.</p>
    </section>
  );
}
