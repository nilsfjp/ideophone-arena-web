import type { IdeophoneOption, RoundResponse } from "./api/types";
import { getConditionPresentation } from "./conditionPresentation";

export function getRoundProblem(round: RoundResponse, targetTranslation: string) {
  if (!round.roundId) {
    return "The backend returned a round without a valid roundId.";
  }

  if (!targetTranslation) {
    return "The backend returned a round without targetTranslation.";
  }

  if (!round.left?.ideophoneId || !round.right?.ideophoneId) {
    return "The backend returned a round without two valid ideophone choices.";
  }

  const presentationKind = getConditionPresentation(round.conditionName).kind;
  if (presentationKind !== "unknown" && !bothOptionsHave(round, "canonicalForm")) {
    return "The backend returned a round without a canonicalForm for both words.";
  }

  if (
    (presentationKind === "script-match" || presentationKind === "script-mismatch") &&
    !bothOptionsHave(round, "displayForm")
  ) {
    return "The backend returned a round without a displayForm for both words.";
  }

  return "";
}

function bothOptionsHave(round: RoundResponse, field: keyof IdeophoneOption) {
  return [round.left, round.right].every((option) =>
    String(option?.[field] ?? "").trim(),
  );
}
