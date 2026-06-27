// Authored preview — the script/placeholder face of a stimulus. Both faces and
// the romaji/meaning reveal slots stay mounted in every phase so the card keeps
// one stable size; phases toggle visibility only. Pre-answer the audio-only
// face shows just a position label; script conditions show the display form;
// the feedback reveal (revealDetails) shows canonical form + romaji + meaning.
import { StimulusDisplay } from "ideophone-arena-web";

const option = {
  ideophoneId: 101,
  displayForm: "きらきら",
  canonicalForm: "きらきら",
  romaji: "kirakira",
  canonicalScript: "HIRAGANA",
};

const scriptMatch = { kind: "script-match" as const, label: "Script match", description: "" };
const audioOnly = { kind: "audio-only" as const, label: "Audio only", description: "" };

// Script-match: the display form is visible during the choice phase.
export const ScriptVisible = () => (
  <StimulusDisplay option={option} presentation={scriptMatch} positionLabel="A" />
);

// Audio-only: neutral position label only, no script (invariant 4).
export const AudioOnly = () => (
  <StimulusDisplay option={option} presentation={audioOnly} positionLabel="B" />
);

// Feedback reveal: canonical form, romaji, and meaning all shown.
export const Revealed = () => (
  <StimulusDisplay
    option={option}
    presentation={scriptMatch}
    positionLabel="A"
    meaning="glittering, sparkling"
    revealDetails
  />
);
