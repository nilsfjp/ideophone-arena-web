import type { ConditionName } from "../api/types";
import { SCRIPT_LAB_CONDITION_OPTIONS } from "../conditionPresentation";
import { Button } from "./ui/button";

type InstructionsProps = {
  isStarting: boolean;
  error?: string;
  includePractice: boolean;
  selectedCondition: ConditionName;
  soundCheckError?: string;
  soundCheckStatus: "idle" | "checking" | "ready" | "error";
  onBackToHome?: () => void;
  onConditionChange: (conditionName: ConditionName) => void;
  onIncludePracticeChange: (includePractice: boolean) => void;
  onSoundCheck: () => void;
  onStart: () => void;
};

export default function Instructions({
  isStarting,
  error,
  includePractice,
  selectedCondition,
  soundCheckError,
  soundCheckStatus,
  onBackToHome,
  onConditionChange,
  onIncludePracticeChange,
  onSoundCheck,
  onStart,
}: InstructionsProps) {
  const soundCheckReady = soundCheckStatus === "ready";

  return (
    <section className="instructions" aria-labelledby="instructions-title">
      <h1 id="instructions-title">Meaning Match Instructions</h1>

      {onBackToHome ? (
        <Button
          className="instructions-back"
          variant="secondary"
          type="button"
          onClick={onBackToHome}
        >
          Back to modes
        </Button>
      ) : null}

      <p>
        In this task, you will see two ideophones and their English meanings.
        Your task is to match one translation with the word you think best fits
        that meaning.
      </p>

      <p>
        First, two words will play automatically in sequence while both
        translation options stay visible. Watch or listen to both before making
        your choice.
      </p>

      <p>
        Then, read the translations and decide which word best matches the
        highlighted target meaning.
      </p>

      <p>
        Choose one card to submit your answer. Feedback appears immediately
        after the backend records the response. Review the note, then click Next
        round when you are ready to continue.
      </p>

      <section className="script-lab-selector" aria-labelledby="script-lab-title">
        <div>
          <h2 id="script-lab-title">Script Lab</h2>
          <p>
            Compare three presentation setups for the same backend-driven task.
          </p>
        </div>

        {/* Condition options stay bespoke (§5): rich multi-line pressed-state
            cards that select the experimental condition. */}
        <div className="condition-option-list" role="group" aria-labelledby="script-lab-title">
          {SCRIPT_LAB_CONDITION_OPTIONS.map((option) => {
            const isSelected = option.conditionName === selectedCondition;

            return (
              <button
                aria-pressed={isSelected}
                className={`condition-option${isSelected ? " active" : ""}`}
                key={option.conditionName}
                type="button"
                onClick={() => onConditionChange(option.conditionName)}
              >
                <span className="condition-option-title">{option.label}</span>
                <span className="condition-option-copy">{option.explanation}</span>
              </button>
            );
          })}
        </div>

        {/* Native checkbox retained: the browser loop associates the practice
            toggle via input[type=checkbox] + .checked, and the wrapping label
            drives the click. A Radix checkbox (role="checkbox" button) would
            break both. */}
        <label className="practice-toggle">
          <input
            checked={includePractice}
            type="checkbox"
            onChange={(event) => onIncludePracticeChange(event.target.checked)}
          />
          <span>Include 2 practice rounds (not scored)</span>
        </label>
      </section>

      <div className="sound-check" aria-live="polite">
        <Button
          variant="secondary"
          disabled={soundCheckStatus === "checking"}
          type="button"
          onClick={onSoundCheck}
        >
          {soundCheckStatus === "checking" ? "Checking..." : "Sound check"}
        </Button>
        {soundCheckReady ? (
          <p className="notice-text">Sound check passed.</p>
        ) : (
          <p className="notice-text">Run the sound check before starting.</p>
        )}
        {soundCheckError ? (
          <p className="error-text centered">
            Sound check failed: {soundCheckError}
          </p>
        ) : null}
      </div>

      {error ? <p className="error-text centered">{error}</p> : null}

      <div className="flex justify-center">
        <Button
          disabled={isStarting || !soundCheckReady}
          type="button"
          onClick={onStart}
        >
          {isStarting ? "Starting..." : "Start Game"}
        </Button>
      </div>
    </section>
  );
}
