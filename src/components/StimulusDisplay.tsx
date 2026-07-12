import type { ConditionPresentation } from "../conditionPresentation";
import type { IdeophoneOption } from "../api/types";

type StimulusDisplayProps = {
  meaning?: string;
  option: IdeophoneOption;
  presentation: ConditionPresentation;
  positionLabel: string;
  revealDetails?: boolean;
};

// Both faces and all reveal slots stay mounted in every phase so the card
// keeps one stable size; phases toggle visibility only (no layout shift,
// CLAUDE.md invariant 5). Pre-answer, the audio-only text face and the
// romaji/meaning slots render empty - never hidden text - so no script or
// romaji exists in the DOM before feedback (invariants 4 and 7).
export default function StimulusDisplay({
  meaning,
  option,
  presentation,
  positionLabel,
  revealDetails = false,
}: StimulusDisplayProps) {
  const showText =
    revealDetails ||
    presentation.kind === "script-match" ||
    presentation.kind === "script-mismatch";
  const scriptText = revealDetails
    ? option.canonicalForm
    : showText
      ? option.displayForm
      : null;

  return (
    <span className="stimulus-display">
      <span
        className={joinClasses(
          "stimulus-face placeholder-display",
          !showText || "face-hidden",
        )}
        aria-hidden={showText}
      >
        <span className="placeholder-mark" aria-hidden="true">
          {positionLabel}
        </span>
        <span className="placeholder-label">{showText ? null : presentation.label}</span>
      </span>

      <span
        className={joinClasses(
          "stimulus-face text-display",
          revealDetails && "revealed-display",
          showText || "face-hidden",
        )}
        aria-hidden={!showText}
      >
        <span className="card-side-label">{positionLabel}</span>
        {/* lang="ja" (§9.2): a rendering attribute so screen readers pick a
            Japanese voice for the kana. Zero string manipulation - the display
            form still arrives from the backend verbatim (invariant 3). */}
        <span className="script-display-text" lang="ja">
          {scriptText}
        </span>
        <span className="romaji-display-text">
          {revealDetails ? option.romaji : null}
        </span>
        <span className="meaning-display-text">{revealDetails ? meaning : null}</span>
      </span>
    </span>
  );
}

function joinClasses(...parts: (string | boolean)[]) {
  return parts.filter((part) => typeof part === "string").join(" ");
}
