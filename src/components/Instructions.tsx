type InstructionsProps = {
  isStarting: boolean;
  error?: string;
  soundCheckError?: string;
  soundCheckStatus: "idle" | "checking" | "ready" | "error";
  onSoundCheck: () => void;
  onStart: () => void;
};

export default function Instructions({
  isStarting,
  error,
  soundCheckError,
  soundCheckStatus,
  onSoundCheck,
  onStart,
}: InstructionsProps) {
  const soundCheckReady = soundCheckStatus === "ready";

  return (
    <section className="instructions" aria-labelledby="instructions-title">
      <h1 id="instructions-title">Choosing Task Instructions</h1>

      <p>
        In this task, you will see two Japanese ideophones and their English
        meanings. Your task is to match one translation with the Japanese word
        you think best fits that meaning.
      </p>

      <p>
        First, two stimuli will play automatically in sequence while both
        translation options stay visible. Watch or listen to both before making
        your choice.
      </p>

      <p>
        Then, read the translations and decide which word best matches the
        highlighted target meaning.
      </p>

      <p>
        Click one stimulus to submit your answer. Feedback appears immediately
        after the backend records the response. Review the note, then click Next
        trial when you are ready to continue.
      </p>

      <p>Demo setup is locked to CONDITION_1_SOKUON, difficulty 1.</p>

      <div className="sound-check" aria-live="polite">
        <button
          className="secondary-button"
          disabled={soundCheckStatus === "checking"}
          type="button"
          onClick={onSoundCheck}
        >
          {soundCheckStatus === "checking" ? "Checking..." : "Sound check"}
        </button>
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

      <button
        className="primary-button"
        disabled={isStarting || !soundCheckReady}
        type="button"
        onClick={onStart}
      >
        {isStarting ? "Starting..." : "Start Game"}
      </button>
    </section>
  );
}
