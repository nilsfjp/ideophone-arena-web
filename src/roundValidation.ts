import { ApiError } from "./api/client";
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

// A round the trial board can actually present: a valid id, a target meaning,
// two options, and a playable stimulus for each. Shared by App (Meaning Match)
// and PerceptionLadder so both apply identical playability semantics.
export function isPlayableRound(round: unknown): round is RoundResponse {
  if (typeof round !== "object" || round === null) {
    return false;
  }

  const candidate = round as Partial<RoundResponse>;
  if (!candidate.roundId) {
    return false;
  }

  const targetTranslation =
    candidate.targetTranslation ??
    candidate.prompt ??
    candidate.translations?.target ??
    "";
  if (!targetTranslation.trim()) {
    return false;
  }

  if (!candidate.left?.ideophoneId || !candidate.right?.ideophoneId) {
    return false;
  }

  const hasPlayableStimulus = (option: RoundResponse["left"]) =>
    Boolean(option?.stimulusUrl || option?.stimulusFile);

  return hasPlayableStimulus(candidate.left) && hasPlayableStimulus(candidate.right);
}

// The next-round call can answer "no more rounds" as a body (completion flags
// or a completion message) rather than an error; recognize it so the caller
// shows the completion state instead of an error.
export function isCompletionPayload(payload: unknown) {
  if (payload === null || payload === undefined) {
    return true;
  }

  if (typeof payload !== "object") {
    return false;
  }

  const completion = payload as {
    complete?: unknown;
    completed?: unknown;
    sessionComplete?: unknown;
    message?: unknown;
    status?: unknown;
  };

  if (
    completion.complete === true ||
    completion.completed === true ||
    completion.sessionComplete === true
  ) {
    return true;
  }

  const message = [completion.message, completion.status]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return /complete|completed|finished|no\s+more|no\s+next|no\s+unanswered/i.test(
    message,
  );
}

// A 404 whose message reads as "no more rounds" — completion, not a real error.
export function isCompletionError(caught: unknown) {
  if (!(caught instanceof ApiError) || caught.status !== 404) {
    return false;
  }

  const body = caught.body;
  const bodyMessage =
    typeof body === "string"
      ? body
      : isErrorMessageBody(body)
        ? [body.message, body.error].filter(Boolean).join(" ")
        : "";
  const message = `${caught.message} ${bodyMessage}`;

  return /complete|completed|finished|no\s+more|no\s+next|no\s+unanswered/i.test(
    message,
  );
}

function isErrorMessageBody(
  body: unknown,
): body is { message?: string; error?: string } {
  return typeof body === "object" && body !== null;
}
