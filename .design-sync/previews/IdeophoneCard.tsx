// Authored preview — composes the real IdeophoneCard from window.IdeophoneArena.
// IdeophoneCard is the trial's stimulus card: a stable-size card that holds a
// script/placeholder face, romaji + meaning reveal slots, and an audio control.
// Audio fetches a backend blob at runtime; with no backend the playback control
// degrades quietly, so previews use mediaVisible={false} (its trial default).
import { IdeophoneCard } from "ideophone-arena-web";

const option = {
  ideophoneId: 101,
  displayForm: "きらきら",
  canonicalForm: "きらきら",
  romaji: "kirakira",
  canonicalScript: "HIRAGANA",
  modality: "VISUAL",
};

const scriptMatch = {
  kind: "script-match" as const,
  label: "Script match",
  description: "Visible script follows the ideophone's canonical script.",
};

const audioOnly = {
  kind: "audio-only" as const,
  label: "Audio only",
  description: "Focus on sound, no script cue.",
};

// Feedback reveal: display form, romaji, and meaning all shown (revealDetails).
export const Revealed = () => (
  <div style={{ maxWidth: 320 }}>
    <IdeophoneCard
      option={option}
      presentation={scriptMatch}
      positionLabel="A"
      meaning="glittering, sparkling"
      revealDetails
    />
  </div>
);

// Choice phase: a selectable card in button mode (script visible, no reveal).
export const ChoiceButton = () => (
  <div style={{ maxWidth: 320 }}>
    <IdeophoneCard
      option={option}
      presentation={scriptMatch}
      positionLabel="A"
      mode="button"
      visible
    />
  </div>
);

// Audio-only condition: pre-answer the card shows a neutral position label
// only — no script, no romaji (experiment invariant 4).
export const AudioOnlyPlaceholder = () => (
  <div style={{ maxWidth: 320 }}>
    <IdeophoneCard
      option={option}
      presentation={audioOnly}
      positionLabel="B"
      mode="button"
      visible
    />
  </div>
);
