import type { ConditionPresentation } from "../conditionPresentation";
import { getVisibleStimulusText } from "../conditionPresentation";
import type { IdeophoneOption } from "../api/types";

type StimulusDisplayProps = {
  option: IdeophoneOption;
  presentation: ConditionPresentation;
  positionLabel: string;
};

export default function StimulusDisplay({
  option,
  presentation,
  positionLabel,
}: StimulusDisplayProps) {
  if (presentation.kind === "script") {
    return (
      <span className="stimulus-display script-display">
        {getVisibleStimulusText(option)}
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
