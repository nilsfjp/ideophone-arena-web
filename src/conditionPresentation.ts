import type { ConditionName } from "./api/types";

export type PresentationKind =
  | "audio-only"
  | "script-match"
  | "script-mismatch"
  | "unknown";

export type ConditionPresentation = {
  kind: PresentationKind;
  label: string;
  description: string;
};

export type ScriptLabConditionOption = {
  conditionName: ConditionName;
  label: string;
  explanation: string;
};

export const SCRIPT_LAB_CONDITION_OPTIONS: ScriptLabConditionOption[] = [
  {
    conditionName: "CONDITION_1_SOKUON",
    label: "Audio only",
    explanation: "Focus on sound, no script cue.",
  },
  {
    conditionName: "CONDITION_2_SOKUON",
    label: "Script match",
    explanation: "Visible script follows the ideophone's canonical script.",
  },
  {
    conditionName: "CONDITION_3_SOKUON",
    label: "Script mismatch",
    explanation: "Visible script intentionally conflicts with the canonical script.",
  },
];

export function getConditionPresentation(
  conditionName: ConditionName | string | undefined,
): ConditionPresentation {
  switch (conditionName) {
    case "CONDITION_1_SOKUON":
      return {
        kind: "audio-only",
        label: "Audio only",
        description: "Focus on sound, no script cue.",
      };
    case "CONDITION_2_SOKUON":
      return {
        kind: "script-match",
        label: "Script match",
        description: "Visible script follows the ideophone's canonical script.",
      };
    case "CONDITION_3_SOKUON":
      return {
        kind: "script-mismatch",
        label: "Script mismatch",
        description: "Visible script intentionally conflicts with the canonical script.",
      };
    default:
      return {
        kind: "unknown",
        label: "Unknown presentation",
        description: "React falls back to a neutral placeholder for unsupported conditions.",
      };
  }
}
