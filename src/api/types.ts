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
  conditionName: ConditionName;
  // Optional, backend default false; when true the session serves 2 practice
  // rounds (practice: true) before scored round 1 (contract 2026-06-11).
  // LADDER sessions reject includePractice (backend), so it is omitted there.
  includePractice?: boolean;
  // NIL-42: absent means CHOOSING (the core Meaning Match loop). LADDER selects
  // a Perception Ladder floor through `floor` (a Modality) — the backend takes
  // explicit floor selection and never an overloaded difficultyLevel (A3).
  gameMode?: GameMode;
  floor?: Modality;
};

export type ConditionName =
  | "CONDITION_1_SOKUON"
  | "CONDITION_2_SOKUON"
  | "CONDITION_3_SOKUON";

// Referent modality of an ideophone / ladder floor. Mirrors the backend enum
// (HAPTIC added for the Touch floor, NIL-42); `| string` tolerates any future
// value the API introduces without a type break.
export type Modality =
  | "AUDITORY"
  | "VISUAL"
  | "HAPTIC"
  | "INTEROCEPTIVE"
  | "PRACTICE"
  | string;

// The session's play mode (backend GameMode enum). Absent/CHOOSING is the core
// Meaning Match loop; LADDER is floor-scoped Perception Ladder serving.
export type GameMode =
  | "CHOOSING"
  | "LADDER"
  | "TEMPLATE_READING"
  | "CROSS_LINGUISTIC";

export type GameSessionResponse = {
  sessionUuid: string;
  conditionName: ConditionName;
  startedAt: string;
  includePractice?: boolean;
  // Present on LADDER sessions (NIL-42): the play mode and the served floor.
  gameMode?: GameMode;
  floor?: Modality;
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

// Perception Ladder overview (GET /api/game/ladder/floors, NIL-42). Floors
// arrive in climb/hierarchy order (Sound → Sight → Touch → Inner states); the
// array index is the floor ordinal — 28B derives "Floor n" from it and never
// persists an ordinal (V3). Floors carry no name/description/thesis-mean; the
// client supplies those per modality (see ladderText.ts). Progress fields are
// the caller's own: `cleared` iff a completed LADDER session for the floor
// exists, with that best session's score; bestCorrect/bestAnswered are null
// while uncleared.
export type LadderPairResponse = {
  pairCode: string;
  finalRung: boolean;
};

export type LadderFloorResponse = {
  modality: Modality;
  pairCount: number;
  finalRungPairCode: string;
  cleared: boolean;
  bestCorrect: number | null;
  bestAnswered: number | null;
  pairs: LadderPairResponse[];
};

export type LadderFloorsResponse = {
  floors: LadderFloorResponse[];
};

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
  // Verbatim kana label from ideophones.display_form (backend 2026-07-06,
  // invariant 1: rendered as stored, never derived/converted). Additive.
  displayForm?: string;
  gloss?: string;
  modality?: Modality;
  guessAccuracy: number | null;
  guessCount: number;
  meanRating: number | null;
  ratingCount: number;
};

// GET /api/research/rating-distributions — PUBLIC, single object. Dense grid:
// every modality with >=1 rating carries all seven cells (ratingValue 1..7,
// zero-filled); modalities with no ratings are omitted entirely (no cells, no
// byModalityN key). byModalityN[m] = the sum of that modality's seven cells =
// the specimen n. Feeds the Observatory raincloud panel.
export type RatingDistributionCell = {
  modality: string;
  ratingValue: number; // 1..7
  count: number;
};

export type RatingDistributionsResponse = {
  distributions: RatingDistributionCell[];
  byModalityN: Record<string, number>;
};

// GET /api/research/position-bias — PUBLIC, single object. SDT fairness check
// on the forced choice, reconstructed from the deterministic per-session
// shuffle. leftPickRate / dPrime / criterion / target*Accuracy are null (NOT
// 0) when a denominator / stimulus class is empty. `dPrime` casing is
// @JsonProperty-pinned on the backend — consume that exact key. Feeds the
// Observatory integrity strip.
export type PositionBiasResponse = {
  n: number;
  leftPickCount: number;
  rightPickCount: number;
  leftPickRate: number | null;
  dPrime: number | null;
  criterion: number | null;
  targetTopN: number;
  targetTopCorrect: number;
  targetTopAccuracy: number | null;
  targetBottomN: number;
  targetBottomCorrect: number;
  targetBottomAccuracy: number | null;
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
