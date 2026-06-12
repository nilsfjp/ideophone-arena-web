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
