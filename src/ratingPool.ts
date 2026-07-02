import type { AnswerResultResponse, RoundResponse } from "./api/types";

// The Rating Lab's word pool. Words enter it only through answered Choosing
// rounds: the round's word→meaning mapping is deliberately unknowable before
// feedback (2AFC anti-leak), and thesis task order (Choosing first) exists so
// revealed meanings never contaminate naive guessing. Rating only
// already-encountered words preserves that.
export const RATING_POOL_STORAGE_KEY = "ideophone-arena-rating-pool";
const RATING_POOL_VERSION = 1;

export type RatingPoolWord = {
  ideophoneId: number;
  canonicalForm?: string;
  romaji?: string;
  stimulusFile?: string;
  stimulusUrl?: string;
  modality?: string;
  meaning: string; // the gloss the player saw for this word at feedback
  sessionUuid: string; // session in which the word was encountered
  addedAt: string; // ISO timestamp; keeps encounter order stable
};

type RatingPoolPayload = {
  version: number;
  username: string;
  words: RatingPoolWord[];
};

// Derives the rateable words revealed by one answered round. Returns [] when
// the mapping cannot be established from backend data — the mapping is never
// guessed client-side.
export function extractRoundWords(
  round: RoundResponse,
  result: AnswerResultResponse,
  now?: string,
): RatingPoolWord[] {
  if (round.practice === true || result.practice === true) {
    return [];
  }

  const correctIdeophoneId =
    result.correctIdeophoneId ??
    (result.correct ? result.selectedIdeophoneId : undefined);
  if (!correctIdeophoneId) {
    return [];
  }

  const targetMeaning = firstNonBlank(
    result.targetTranslation,
    round.targetTranslation,
    round.prompt,
    round.translations?.target,
  );
  const otherMeaning = firstNonBlank(round.translations?.other);

  const addedAt = now ?? new Date().toISOString();
  const words: RatingPoolWord[] = [];

  for (const option of [round.left, round.right]) {
    if (!option?.ideophoneId) {
      continue;
    }

    const meaning =
      option.ideophoneId === correctIdeophoneId ? targetMeaning : otherMeaning;
    if (!meaning) {
      continue;
    }

    words.push({
      ideophoneId: option.ideophoneId,
      canonicalForm: option.canonicalForm,
      romaji: option.romaji,
      stimulusFile: option.stimulusFile,
      stimulusUrl: option.stimulusUrl,
      modality: option.modality,
      meaning,
      sessionUuid: round.sessionUuid,
      addedAt,
    });
  }

  return words;
}

// Appends new words, deduplicating by ideophoneId (first encounter wins).
// Returns the same reference when nothing was added so callers can skip
// persistence.
export function addWordsToPool(
  pool: RatingPoolWord[],
  words: RatingPoolWord[],
): RatingPoolWord[] {
  const known = new Set(pool.map((word) => word.ideophoneId));
  const fresh = words.filter((word) => {
    if (known.has(word.ideophoneId)) {
      return false;
    }
    known.add(word.ideophoneId);
    return true;
  });

  return fresh.length > 0 ? [...pool, ...fresh] : pool;
}

// Ratings are per-user server-side, and pool entries carry sessionUuids that
// 403 for anyone else — so the payload is username-scoped and any mismatch
// reads as an empty pool.
export function parsePool(raw: string | null, username: string): RatingPoolWord[] {
  if (!raw) {
    return [];
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRatingPoolPayload(payload)) {
    return [];
  }

  if (payload.version !== RATING_POOL_VERSION || payload.username !== username) {
    return [];
  }

  return payload.words.filter(isRatingPoolWord);
}

export function serializePool(words: RatingPoolWord[], username: string): string {
  const payload: RatingPoolPayload = {
    version: RATING_POOL_VERSION,
    username,
    words,
  };
  return JSON.stringify(payload);
}

export function readRatingPool(username: string): RatingPoolWord[] {
  try {
    return parsePool(localStorage.getItem(RATING_POOL_STORAGE_KEY), username);
  } catch {
    return [];
  }
}

export function writeRatingPool(username: string, words: RatingPoolWord[]): void {
  try {
    localStorage.setItem(RATING_POOL_STORAGE_KEY, serializePool(words, username));
  } catch {
    // Storage may be full or unavailable; the in-memory pool still works for
    // this visit.
  }
}

function firstNonBlank(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

function isRatingPoolPayload(payload: unknown): payload is RatingPoolPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Partial<RatingPoolPayload>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.username === "string" &&
    Array.isArray(candidate.words)
  );
}

function isRatingPoolWord(word: unknown): word is RatingPoolWord {
  if (typeof word !== "object" || word === null) {
    return false;
  }

  const candidate = word as Partial<RatingPoolWord>;
  return (
    typeof candidate.ideophoneId === "number" &&
    candidate.ideophoneId > 0 &&
    typeof candidate.meaning === "string" &&
    candidate.meaning.length > 0 &&
    typeof candidate.sessionUuid === "string"
  );
}
