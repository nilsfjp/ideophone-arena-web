export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  username?: string;
  role?: string;
};

export type StartSessionRequest = {
  difficultyLevel: number;
  conditionName: ConditionName;
  // Optional, backend default false; when true the session serves 2 practice
  // rounds (practice: true) before scored round 1 (contract 2026-06-11).
  includePractice?: boolean;
};

export type ConditionName =
  | "CONDITION_1_SOKUON"
  | "CONDITION_2_SOKUON"
  | "CONDITION_3_SOKUON";

export type Modality = "AUDITORY" | "VISUAL" | "INTEROCEPTIVE" | "PRACTICE" | string;

export type GameSessionResponse = {
  sessionUuid: string;
  difficultyLevel: number;
  conditionName: ConditionName;
  startedAt: string;
  includePractice?: boolean;
};

export type IdeophoneOption = {
  ideophoneId: number;
  kana?: string;
  displayForm?: string;
  canonicalForm?: string;
  romaji?: string;
  canonicalScript?: string;
  modality?: Modality;
  stimulusFile?: string;
  stimulusUrl?: string;
};

export type RoundResponse = {
  sessionUuid: string;
  roundId: number;
  targetTranslation: string;
  prompt?: string;
  conditionName: ConditionName;
  difficultyLevel: number;
  translations?: {
    target?: string;
    other?: string;
  };
  practice?: boolean;
  // Seed-drawn presentation flag (27E): true when the target meaning fills
  // the first of the two meaning lines. The renderer treats a missing value
  // (older backend payload) as true, the historical order.
  targetMeaningListedFirst: boolean;
  left: IdeophoneOption;
  right: IdeophoneOption;
  timing?: {
    fixationMs?: number;
    preChoiceDelayMs?: number;
  };
};

export type CompletionResponse = {
  complete?: boolean;
  completed?: boolean;
  sessionComplete?: boolean;
  message?: string;
  status?: string;
};

export type NextRoundResponse = RoundResponse | CompletionResponse | null | undefined;

export type SubmitAnswerRequest = {
  roundId: number;
  selectedIdeophoneId: number;
  responseTimeMs: number;
};

export type AnswerResultResponse = {
  roundId: number;
  selectedIdeophoneId: number;
  correctIdeophoneId?: number;
  correct: boolean;
  targetTranslation?: string;
  prompt?: string;
  correctKana?: string;
  selectedKana?: string;
  totalAnswered: number;
  totalCorrect: number;
  // Mirrors the round's flag; practice answers return feedback but never
  // increment totals (always false/absent for scored rounds).
  practice?: boolean;
};

// Best *completed* session per user (contract change 2026-06-11; replaced the
// lifetime totalCorrect/totalAnswered/accuracy fields).
export type LeaderboardEntry = {
  username: string;
  bestSessionCorrect: number;
  bestSessionAnswered: number;
  bestSessionAccuracy: number;
};

// Paginated wrapper introduced by the backend on 2026-06-11; `page` is
// 0-indexed and out-of-range request params are clamped server-side, so the
// metadata reports the effective values.
export type LeaderboardPageResponse = {
  entries: LeaderboardEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AttemptResponse = {
  answeredAt?: string;
  targetTranslation?: string;
  prompt?: string;
  selectedKana?: string;
  correctKana?: string;
  correct: boolean;
  responseTimeMs?: number;
};

// Ratings surface (backend NIL-32/33/34, 2026-06-29). One rating per
// (user, ideophone): re-rating returns 409, NOT an upsert.
export type RatingRequest = {
  ideophoneId: number;
  rating: number; // 1..7
  responseTimeMs?: number; // 0..600000
  sessionUuid?: string; // provenance only; 404 unknown / 403 foreign
};

export type RatingResponse = {
  id: number;
  ideophoneId: number;
  rating: number;
  responseTimeMs?: number | null;
  ratedAt: string; // ISO instant
};

// Paginated wrapper mirroring LeaderboardPageResponse; size clamped 1..50
// server-side, entries ordered ratedAt desc.
export type RatingPageResponse = {
  entries: RatingResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/game/me/ratable-words (27E) — the server-side Rating Lab pool:
// words encountered through answered scored rounds, minus already-rated. The
// thesis contamination rule is enforced by the backend; `meaning` is the
// word's own gloss, exactly as the round feedback revealed it. Entries come
// encounter-ordered and deduplicated.
export type RatableWordResponse = {
  ideophoneId: number;
  canonicalForm?: string;
  romaji?: string;
  stimulusFile?: string;
  modality?: Modality;
  meaning: string;
};

// Paginated wrapper mirroring RatingPageResponse (size clamped 1..50).
export type RatableWordPageResponse = {
  entries: RatableWordResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/research/divergence — PUBLIC, bare array (no wrapper). One row per
// ideophone with >=1 guess OR >=1 rating; aggregates are null (not 0) when
// that side has zero observations.
export type DivergenceEntry = {
  ideophoneId: number;
  romaji?: string;
  gloss?: string;
  modality?: Modality;
  guessAccuracy: number | null;
  guessCount: number;
  meanRating: number | null;
  ratingCount: number;
};

export type TrialPhase =
  | "idle"
  | "loading"
  | "fixation"
  | "left-playing"
  | "right-playing"
  | "choice"
  | "submitting"
  | "feedback"
  | "complete"
  | "error";
