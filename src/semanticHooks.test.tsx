import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  AnswerResultResponse,
  IdeophoneOption,
  RoundResponse,
} from "./api/types";
import { getConditionPresentation } from "./conditionPresentation";
import AuthForm from "./components/AuthForm";
import FeedbackPanel from "./components/FeedbackPanel";
import IdeophoneCard from "./components/IdeophoneCard";
import Instructions from "./components/Instructions";
import { LeaderboardPanel } from "./components/Leaderboard";
import ModeSelect from "./components/ModeSelect";
import { RatingTrialPanel } from "./components/RatingLab";
import TrialPlayer from "./components/TrialPlayer";
import { MODES } from "./modes";

// Guard (spec §11.3.1) — the migration's replacement for exact-markup pinning.
// It protects the *substrate* of the browser-loop waypoints and the §5
// stable-hook contract: every semantic hook still resolves as a class token,
// and Tailwind utilities are only ever appended AFTER the semantic class(es),
// never prepended before a hook. This is what keeps `.trial-board`,
// `.rating-scale-button`, `.mode-card`, ... selectors working after the shadcn
// migration.

const OPTION_A: IdeophoneOption = {
  ideophoneId: 62,
  kana: "かたかた",
  displayForm: "カタカタ",
  canonicalForm: "カタカタ",
  romaji: "katakata",
};

const OPTION_B: IdeophoneOption = {
  ideophoneId: 125,
  kana: "じゃあじゃあ",
  displayForm: "ジャージャー",
  canonicalForm: "じゃーじゃー",
  romaji: "zyaazyaa",
};

const ROUND: RoundResponse = {
  sessionUuid: "s",
  roundId: 7,
  targetTranslation: "clattering, rattling",
  conditionName: "CONDITION_1_SOKUON",
  difficultyLevel: 1,
  targetMeaningListedFirst: true,
  translations: { target: "clattering, rattling", other: "noisily gushing" },
  left: OPTION_A,
  right: OPTION_B,
};

const RESULT: AnswerResultResponse = {
  roundId: 7,
  correct: false,
  selectedIdeophoneId: 62,
  correctIdeophoneId: 125,
  targetTranslation: "clattering, rattling",
  totalAnswered: 1,
  totalCorrect: 0,
};

function combinedMarkup(): string {
  return [
    renderToStaticMarkup(
      <TrialPlayer
        round={ROUND}
        sessionStats={{ answered: 0, correct: 0 }}
        sessionUuid="s"
        totalRounds={30}
        onAnswered={() => {}}
        onAuthExpired={() => {}}
        onBackToStart={() => {}}
        onNeedNextRound={() => {}}
      />,
    ),
    renderToStaticMarkup(<FeedbackPanel result={RESULT} round={ROUND} />),
    renderToStaticMarkup(
      <IdeophoneCard
        mode="button"
        option={OPTION_A}
        positionLabel="A"
        presentation={getConditionPresentation("CONDITION_2_SOKUON")}
        replayVisible
        visible
        onReplay={() => {}}
      />,
    ),
    renderToStaticMarkup(
      <RatingTrialPanel
        index={0}
        phase="rating"
        replayToken={1}
        reveal={null}
        selectedRating={null}
        statusMessage=""
        total={12}
        word={{
          ideophoneId: 62,
          canonicalForm: "カタカタ",
          romaji: "katakata",
          stimulusFile: "audio/a.m4a",
          modality: "AUDITORY",
          meaning: "clattering, rattling",
        }}
        onNext={() => {}}
        onPlaybackError={() => {}}
        onReplay={() => {}}
        onSelectRating={() => {}}
        onSubmit={() => {}}
      />,
    ),
    renderToStaticMarkup(<ModeSelect modes={MODES} onSelect={() => {}} />),
    renderToStaticMarkup(
      <Instructions
        difficultyLevel={1}
        includePractice
        isStarting={false}
        selectedCondition="CONDITION_1_SOKUON"
        soundCheckStatus="idle"
        onConditionChange={() => {}}
        onIncludePracticeChange={() => {}}
        onSoundCheck={() => {}}
        onStart={() => {}}
      />,
    ),
    renderToStaticMarkup(
      <LeaderboardPanel
        data={{
          entries: [
            {
              username: "alpha",
              bestSessionCorrect: 1,
              bestSessionAnswered: 2,
              bestSessionAccuracy: 0.5,
            },
          ],
          page: 0,
          size: 10,
          totalElements: 25,
          totalPages: 3,
        }}
        onPageChange={() => {}}
      />,
    ),
    renderToStaticMarkup(<AuthForm onAuthenticated={() => {}} />),
  ].join("\n");
}

// Hooks the proof battery pins (browser loop + verify scripts), obtainable from
// the static renders above.
const PINNED_HOOKS = [
  "trial-stage",
  "trial-board",
  "stimulus-row",
  "ideophone-card",
  "choice-button",
  "card-replay-button",
  "question-slot",
  "question-text",
  "feedback-next-button",
  "fixation-cross",
  "feedback",
  "sound-check",
  "mode-card",
  "rating-scale-button",
  "rating-next-button",
  "rating-reveal",
  "status-line",
  "leaderboard-pager",
  "script-display-text",
  "romaji-display-text",
  "meaning-display-text",
  "feedback-choice-card",
  "slot-hidden",
  "auth-tabs",
];

// Hooks the verify scripts / repaired tests match by CLASS PREFIX (`class="hook`
// or first-token reads) — these MUST be the first class token on their element,
// so appended utilities never break the match. The remaining pinned hooks are
// used via querySelector-by-class (position-agnostic): they need only resolve.
// `auth-tabs` is a decorative marker on the shadcn TabsList (utilities-first per
// shadcn idiom) and is not prefix-matched anywhere, so it is presence-only.
const FIRST_TOKEN_HOOKS = [
  "rating-scale-button",
  "question-slot",
  "script-display-text",
  "romaji-display-text",
  "meaning-display-text",
  "feedback-choice-card",
  "rating-reveal",
];

function classAttrsContaining(markup: string, hook: string): string[] {
  const out: string[] = [];
  const re = /class="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markup))) {
    if (match[1].split(/\s+/).includes(hook)) out.push(match[1]);
  }
  return out;
}

describe("stable-hook contract (§5/§11.3.1)", () => {
  const markup = combinedMarkup();

  it("every pinned semantic hook still resolves as a class token", () => {
    for (const hook of PINNED_HOOKS) {
      expect(
        classAttrsContaining(markup, hook).length,
        `hook "${hook}" is missing from the proof-battery render`,
      ).toBeGreaterThan(0);
    }
  });

  it("prefix-matched hooks stay the first class token on their element", () => {
    for (const hook of FIRST_TOKEN_HOOKS) {
      for (const cls of classAttrsContaining(markup, hook)) {
        expect(
          cls.split(/\s+/)[0],
          `class "${cls}" must lead with the prefix-matched hook "${hook}"`,
        ).toBe(hook);
      }
    }
  });
});
