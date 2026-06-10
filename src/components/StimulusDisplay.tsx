import type { ConditionPresentation } from "../conditionPresentation";
import type { IdeophoneOption } from "../api/types";

type StimulusDisplayProps = {
  meaning?: string;
  option: IdeophoneOption;
  presentation: ConditionPresentation;
  positionLabel: string;
  revealDetails?: boolean;
};

export default function StimulusDisplay({
  meaning,
  option,
  presentation,
  positionLabel,
  revealDetails = false,
}: StimulusDisplayProps) {
  if (revealDetails) {
    return (
      <span className="stimulus-display revealed-display">
        <span className="card-side-label">{positionLabel}</span>
        <span className="script-display-text">{option.canonicalForm}</span>
        {option.romaji ? (
          <span className="romaji-display-text">{option.romaji}</span>
        ) : null}
        {meaning ? <span className="meaning-display-text">{meaning}</span> : null}
      </span>
    );
  }

  if (presentation.kind === "script-match" || presentation.kind === "script-mismatch") {
    return (
      <span className="stimulus-display script-display">
        <span className="card-side-label">{positionLabel}</span>
        <span className="script-display-text">{option.displayForm}</span>
      </span>
    );
  }

  return (
    <span className="stimulus-display placeholder-display">
      <span className="placeholder-mark" aria-hidden="true">
        {positionLabel}
      </span>
      <span className="placeholder-label">{presentation.label}</span>
    </span>
  );
}
