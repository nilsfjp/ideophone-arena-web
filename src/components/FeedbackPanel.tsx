import type { AnswerResultResponse, IdeophoneOption, RoundResponse } from "../api/types";

type FeedbackPanelProps = {
  result: AnswerResultResponse;
  round: RoundResponse;
};

export default function FeedbackPanel({
  result,
  round,
}: FeedbackPanelProps) {
  const selectedSummary = getChoiceSummary(round, result, "selected");
  const correctSummary = getChoiceSummary(round, result, "correct");
  const selectedIsCorrect = selectedSummary.side === correctSummary.side;

  return (
    <section
      className={result.correct ? "feedback correct" : "feedback incorrect"}
      aria-live="polite"
    >
      <h2>{result.correct ? "Correct" : "Incorrect"}</h2>

      {/* Both grid cells render for both outcomes so panel height never
          depends on correctness; the correct outcome hides the second card
          but keeps its reserved space (same reserved-slot idiom as the
          trial board). */}
      <div className="feedback-choice-grid">
        {selectedIsCorrect ? (
          <>
            <ChoiceSummaryCard title="You chose" summary={correctSummary} />
            <ChoiceSummaryCard
              title="Correct word"
              summary={correctSummary}
              hidden
            />
          </>
        ) : (
          <>
            <ChoiceSummaryCard title="You chose" summary={selectedSummary} />
            <ChoiceSummaryCard title="Correct word" summary={correctSummary} />
          </>
        )}
      </div>
    </section>
  );
}

type ChoiceSummaryKind = "selected" | "correct";

type ChoiceSummary = {
  displayForm: string;
  meaning: string;
  romaji: string;
  side: string;
};

function ChoiceSummaryCard({
  hidden = false,
  summary,
  title,
}: {
  hidden?: boolean;
  summary: ChoiceSummary;
  title?: string;
}) {
  return (
    <article
      className={
        hidden ? "feedback-choice-card slot-hidden" : "feedback-choice-card"
      }
      aria-hidden={hidden || undefined}
    >
      {title ? <h3>{title}</h3> : null}
      <p className="feedback-side">Card {summary.side}</p>
      {/* lang="ja" (§9.2): rendering attribute only; the reveal form is the
          backend value, never derived. */}
      <p className="feedback-display-form" lang="ja">
        {summary.displayForm}
      </p>
      <dl>
        <dt>Romaji</dt>
        <dd>{summary.romaji}</dd>
        <dt>Meaning</dt>
        <dd>{summary.meaning}</dd>
      </dl>
    </article>
  );
}

function getChoiceSummary(
  round: RoundResponse,
  result: AnswerResultResponse,
  kind: ChoiceSummaryKind,
): ChoiceSummary {
  const option =
    kind === "selected"
      ? findOption(round, result.selectedIdeophoneId) ??
        findOptionByKana(round, result.selectedKana)
      : findOption(round, result.correctIdeophoneId) ??
        findOptionByKana(round, result.correctKana) ??
        (result.correct
          ? findOption(round, result.selectedIdeophoneId)
          : undefined);
  const side = getSide(round, option);

  return {
    displayForm: option?.canonicalForm ?? fallbackKana(kind, result),
    meaning: getMeaning(round, result, option, kind),
    romaji: option?.romaji ?? "Unavailable",
    side,
  };
}

function findOption(round: RoundResponse, ideophoneId?: number) {
  if (!ideophoneId) {
    return undefined;
  }

  return getOptions(round).find((option) => option.ideophoneId === ideophoneId);
}

function findOptionByKana(round: RoundResponse, kana?: string) {
  const normalizedKana = kana?.trim();
  if (!normalizedKana) {
    return undefined;
  }

  return getOptions(round).find((option) => option.kana?.trim() === normalizedKana);
}

function getOptions(round: RoundResponse): IdeophoneOption[] {
  return [round.left, round.right];
}

function getSide(round: RoundResponse, option?: IdeophoneOption) {
  if (!option) {
    return "unknown";
  }

  if (option.ideophoneId === round.left.ideophoneId) {
    return "A";
  }
  if (option.ideophoneId === round.right.ideophoneId) {
    return "B";
  }

  return "unknown";
}

function getMeaning(
  round: RoundResponse,
  result: AnswerResultResponse,
  option: IdeophoneOption | undefined,
  kind: ChoiceSummaryKind,
) {
  const targetMeaning =
    result.targetTranslation ?? result.prompt ?? round.targetTranslation ?? round.prompt;
  if (kind === "correct") {
    return targetMeaning ?? "Unavailable";
  }

  if (result.correct) {
    return targetMeaning ?? "Unavailable";
  }

  if (option?.ideophoneId === result.correctIdeophoneId) {
    return targetMeaning ?? "Unavailable";
  }

  return round.translations?.other ?? "Not provided by this round";
}

function fallbackKana(kind: ChoiceSummaryKind, result: AnswerResultResponse) {
  if (kind === "selected") {
    return result.selectedKana ?? "Unavailable";
  }

  return result.correctKana ?? "Unavailable";
}
