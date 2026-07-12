// Authored preview - RatingLab is the Rating Task orchestrator (backend-coupled:
// it fetches the rating pool on mount), so instead of the fetching shell we show
// its real presentational panels, which are exported alongside it on
// window.IdeophoneArena. All participant-facing copy is the frozen text baked
// into the components (experimentText.ts) - the preview only supplies data.
import {
  RatingInstructionsPanel,
  RatingTrialPanel,
  LabRecordPanel,
  RatingDonePanel,
  RatingEmptyState,
} from "ideophone-arena-web";

const noop = () => {};
const col: React.CSSProperties = { padding: "var(--space-4)", maxWidth: 620 };

// Audio-only stimulus (no script/romaji until the lab record); playback quietly
// no-ops in the preview because there is no backend media source.
const word = {
  ideophoneId: 101,
  romaji: "kirakira",
  meaning: "glittering, sparkling",
};

const rows = [
  { ideophoneId: 101, romaji: "kirakira", gloss: "glittering, sparkling", yourRating: 6, meanRating: 5.4, ratingCount: 42, guessAccuracy: 0.71, guessCount: 88 },
  { ideophoneId: 102, romaji: "fuwafuwa", gloss: "soft, fluffy", yourRating: 7, meanRating: 6.1, ratingCount: 37, guessAccuracy: 0.63, guessCount: 71 },
  { ideophoneId: 103, romaji: "dokidoki", gloss: "heart pounding, nervous", yourRating: 4, meanRating: 4.8, ratingCount: 29, guessAccuracy: null, guessCount: 0 },
];

// The frozen Rating Task instructions (dynamic word count).
export const Instructions = () => (
  <div style={col}>
    <RatingInstructionsPanel
      wordCount={12}
      alreadyRatedCount={3}
      onBegin={noop}
      onBack={noop}
    />
  </div>
);

// One word's rating screen: audio-only stimulus, the frozen meaning line, and
// the 1–7 resemblance scale (5 selected here).
export const Trial = () => (
  <div style={col}>
    <RatingTrialPanel
      word={word}
      index={2}
      total={12}
      phase="rating"
      selectedRating={5}
      reveal={null}
      statusMessage=""
      replayToken={0}
      onSelectRating={noop}
      onReplay={noop}
      onSubmit={noop}
      onNext={noop}
      onPlaybackError={noop}
    />
  </div>
);

// The player's cumulative lab record (script/romaji revealed here only).
export const LabRecord = () => (
  <div style={col}>
    <LabRecordPanel rows={rows} />
  </div>
);

// Completion screen (composes the lab record).
export const Done = () => (
  <div style={col}>
    <RatingDonePanel hasQueueRun rows={rows} onBackToHome={noop} />
  </div>
);

// Empty state: no words met yet.
export const Empty = () => (
  <div style={col}>
    <RatingEmptyState onBackToHome={noop} onGoToChoosing={noop} />
  </div>
);
