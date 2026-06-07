import type { ConditionName, IdeophoneOption } from "./api/types";

export type PresentationKind = "audio-only" | "script" | "unknown";

export type ConditionPresentation = {
  kind: PresentationKind;
  label: string;
  description: string;
};

export function getConditionPresentation(
  conditionName: ConditionName | string | undefined,
): ConditionPresentation {
  switch (conditionName) {
    case "CONDITION_1_SOKUON":
      return {
        kind: "audio-only",
        label: "Audio only",
        description: "React renders a neutral placeholder while legacy media supplies sound.",
      };
    case "CONDITION_2_SOKUON":
      return {
        kind: "script",
        label: "Script match",
        description: "React renders the intended script instead of trusting media visuals.",
      };
    case "CONDITION_3_SOKUON":
      return {
        kind: "script",
        label: "Script mismatch",
        description: "React renders script deliberately when mismatch data is present.",
      };
    default:
      return {
        kind: "unknown",
        label: "Unknown presentation",
        description: "React falls back to a neutral placeholder for unsupported conditions.",
      };
  }
}

export function getVisibleStimulusText(option: IdeophoneOption) {
  return (
    option.canonicalScript ??
    option.kana ??
    option.romaji ??
    `Option ${option.ideophoneId}`
  );
}
