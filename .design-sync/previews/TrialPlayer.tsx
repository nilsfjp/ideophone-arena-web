// Authored preview — the full trial board. TrialPlayer drives the fixed phase
// order (fixation → left plays → right plays → choice → feedback) for one round
// and submits the answer to the backend. With no backend the audio fetch fails
// quietly and the board stays on its opening phase; the preview shows the
// two-card trial layout, the meaning prompt, and the round chrome. Callbacks are
// no-ops. (Frozen participant-facing wording is rendered verbatim by the real
// component — never restated here.)
import { TrialPlayer } from "ideophone-arena-web";

const round = {
  sessionUuid: "demo-session",
  roundId: 1,
  targetTranslation: "glittering, sparkling",
  conditionName: "CONDITION_2_SOKUON" as const,
  difficultyLevel: 1,
  translations: { target: "glittering, sparkling", other: "heart pounding" },
  practice: false,
  left: {
    ideophoneId: 101,
    displayForm: "きらきら",
    canonicalForm: "きらきら",
    romaji: "kirakira",
    canonicalScript: "HIRAGANA",
  },
  right: {
    ideophoneId: 102,
    displayForm: "どきどき",
    canonicalForm: "どきどき",
    romaji: "dokidoki",
    canonicalScript: "HIRAGANA",
  },
  timing: { fixationMs: 600, preChoiceDelayMs: 300 },
};

export const TrialBoard = () => (
  <TrialPlayer
    sessionUuid="demo-session"
    round={round}
    sessionStats={{ answered: 2, correct: 2 }}
    totalRounds={10}
    onNeedNextRound={() => {}}
    onBackToStart={() => {}}
    onAnswered={() => {}}
    onAuthExpired={() => {}}
  />
);
