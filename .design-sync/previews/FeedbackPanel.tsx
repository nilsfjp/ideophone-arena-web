// Authored preview — the post-answer feedback panel. It reads a RoundResponse
// and an AnswerResultResponse and lets a non-Japanese reader identify, for both
// the selected and correct words: side (A/B), display form, romaji, and meaning.
// Both grid cells always render so panel height never depends on correctness.
import { FeedbackPanel } from "ideophone-arena-web";

const left = {
  ideophoneId: 101,
  displayForm: "きらきら",
  canonicalForm: "きらきら",
  romaji: "kirakira",
  modality: "VISUAL",
};
const right = {
  ideophoneId: 102,
  displayForm: "どきどき",
  canonicalForm: "どきどき",
  romaji: "dokidoki",
  modality: "INTEROCEPTIVE",
};

const round = {
  sessionUuid: "demo-session",
  roundId: 7,
  targetTranslation: "glittering, sparkling",
  conditionName: "CONDITION_2_SOKUON" as const,
  difficultyLevel: 1,
  translations: { target: "glittering, sparkling", other: "heart pounding" },
  left,
  right,
};

// Correct: the chosen word matched the target.
export const Correct = () => (
  <FeedbackPanel
    round={round}
    result={{
      roundId: 7,
      selectedIdeophoneId: 101,
      correctIdeophoneId: 101,
      correct: true,
      targetTranslation: "glittering, sparkling",
      correctKana: "きらきら",
      selectedKana: "きらきら",
      totalAnswered: 5,
      totalCorrect: 4,
    }}
  />
);

// Incorrect: both the chosen and the correct word are shown side by side.
export const Incorrect = () => (
  <FeedbackPanel
    round={round}
    result={{
      roundId: 7,
      selectedIdeophoneId: 102,
      correctIdeophoneId: 101,
      correct: false,
      targetTranslation: "glittering, sparkling",
      correctKana: "きらきら",
      selectedKana: "どきどき",
      totalAnswered: 5,
      totalCorrect: 3,
    }}
  />
);
