import type {
  AnswerResultResponse,
  IdeophoneOption,
  Modality,
  RoundResponse,
} from "./api/types";

export type ResearchFlavorNote = {
  label: string;
  text: string;
};

export function getResearchFlavorNote(
  round: RoundResponse,
  result: AnswerResultResponse,
): ResearchFlavorNote {
  const selectedOption = findOption(round, result.selectedIdeophoneId);
  const correctOption =
    findOption(round, result.correctIdeophoneId) ??
    findOptionByKana(round, result.correctKana) ??
    (result.correct ? selectedOption : undefined);
  const modality = normalizeModality(correctOption?.modality ?? selectedOption?.modality);

  return {
    label: labelFor(modality, result.correct),
    text: [modalityText(modality), conditionText(round.conditionName)]
      .filter(Boolean)
      .join(" "),
  };
}

function findOption(round: RoundResponse, ideophoneId?: number) {
  if (!ideophoneId) {
    return undefined;
  }

  return getOptions(round).find((option) => option.ideophoneId === ideophoneId);
}

function findOptionByKana(round: RoundResponse, kana?: string) {
  const normalizedKana = kana?.trim();
  if (!normalizedKana) {
    return undefined;
  }

  return getOptions(round).find((option) => option.kana?.trim() === normalizedKana);
}

function getOptions(round: RoundResponse): IdeophoneOption[] {
  return [round.left, round.right];
}

function normalizeModality(modality?: Modality) {
  const normalized = modality?.toUpperCase();
  if (
    normalized === "AUDITORY" ||
    normalized === "VISUAL" ||
    normalized === "HAPTIC" ||
    normalized === "INTEROCEPTIVE"
  ) {
    return normalized;
  }

  return "UNKNOWN";
}

function labelFor(modality: ReturnType<typeof normalizeModality>, correct: boolean) {
  const prefix = correct ? "Research note" : "Research contrast";

  if (modality === "UNKNOWN") {
    return prefix;
  }

  return `${prefix}: ${modality.toLowerCase()}`;
}

function modalityText(modality: ReturnType<typeof normalizeModality>) {
  switch (modality) {
    case "AUDITORY":
      return "Auditory ideophones often make sound-to-sound mappings feel immediately available.";
    case "VISUAL":
      return "Visual ideophones ask you to map sound onto shape, motion, or appearance.";
    case "INTEROCEPTIVE":
      return "Interoceptive ideophones point toward internal states, so their expressiveness can be harder to pin down quickly.";
    case "HAPTIC":
      return "Haptic ideophones map sound onto texture and touch — a newer floor with no thesis baseline yet.";
    default:
      return "This round still tests a form-meaning guess; a correct choice is not the same thing as proving stronger iconicity.";
  }
}

function conditionText(conditionName: RoundResponse["conditionName"]) {
  switch (conditionName) {
    case "CONDITION_1_SOKUON":
      return "Audio-only play keeps the focus on sound rather than script cues.";
    case "CONDITION_2_SOKUON":
      return "Matched script can be explored here, but this app should not imply that it guarantees easier guessing.";
    case "CONDITION_3_SOKUON":
      return "Mismatched script is useful for exploring orthography without treating it as the whole explanation.";
    default:
      return "";
  }
}
