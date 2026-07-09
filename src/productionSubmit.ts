// What a failed mint means for the player's one try. Pure and separate from the
// component, so the one-shot promise is provable without a DOM: only
// "keep-trying" leaves the attempt on the same word, and only "advance" moves
// past it.
import { ApiError, isUnparseableInput } from "./api/client";

export type MintSubmitOutcome =
  | { kind: "keep-trying"; parseError: boolean; message: string }
  | { kind: "advance" }
  | { kind: "auth-expired"; message: string };

export function classifySubmitError(caught: unknown): MintSubmitOutcome {
  if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
    return { kind: "auth-expired", message: caught.message };
  }
  // An unparseable form never reached the table, so the attempt survives a typo.
  // The player sees the frozen §8.1 helper, never the backend's message.
  if (isUnparseableInput(caught)) {
    return { kind: "keep-trying", parseError: true, message: "" };
  }
  // Already minted (another device, or a replayed request): the first instinct
  // is the datum, so move on rather than overwrite it.
  if (caught instanceof ApiError && caught.status === 409) {
    return { kind: "advance" };
  }
  return {
    kind: "keep-trying",
    parseError: false,
    message: caught instanceof Error ? caught.message : "Could not mint that word.",
  };
}
