// Authored preview — the pre-game start screen. Instructions presents the
// Script Lab condition picker, a practice-round toggle, a sound check, and the
// start control. Callbacks are no-ops here; the cells differ by the condition
// selected and the sound-check status so the variant axis is visible.
import { Instructions } from "ideophone-arena-web";

const noop = () => {};

// Default idle state, "Script match" condition selected, practice on.
export const Idle = () => (
  <Instructions
    difficultyLevel={1}
    isStarting={false}
    includePractice
    selectedCondition="CONDITION_2_SOKUON"
    soundCheckStatus="idle"
    onConditionChange={noop}
    onIncludePracticeChange={noop}
    onSoundCheck={noop}
    onStart={noop}
  />
);

// Sound check passed, audio-only condition selected.
export const SoundReady = () => (
  <Instructions
    difficultyLevel={1}
    isStarting={false}
    includePractice={false}
    selectedCondition="CONDITION_1_SOKUON"
    soundCheckStatus="ready"
    onConditionChange={noop}
    onIncludePracticeChange={noop}
    onSoundCheck={noop}
    onStart={noop}
  />
);

// Error state surfaced before starting.
export const WithError = () => (
  <Instructions
    difficultyLevel={1}
    isStarting={false}
    includePractice
    selectedCondition="CONDITION_3_SOKUON"
    soundCheckStatus="error"
    soundCheckError="Could not play the test sound."
    error="Could not start the session. Please try again."
    onConditionChange={noop}
    onIncludePracticeChange={noop}
    onSoundCheck={noop}
    onStart={noop}
  />
);
