import type {
  AnswerResultResponse,
  AttemptResponse,
  AuthResponse,
  DivergenceEntry,
  GameSessionResponse,
  LadderFloorsResponse,
  LeaderboardPageResponse,
  LoginRequest,
  NextRoundResponse,
  PositionBiasResponse,
  RatableWordPageResponse,
  RatableWordResponse,
  RatingDistributionsResponse,
  RatingPageResponse,
  RatingRequest,
  RatingResponse,
  RegisterRequest,
  StartSessionRequest,
  SubmitAnswerRequest,
} from "./types";

const API_BASE_URL = (
  String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081").trim()
).replace(/\/$/, "");

const TOKEN_STORAGE_KEY = "ideophone-arena-token";

type JsonBody = unknown;

type ApiErrorBody = {
  message?: string;
  error?: string;
  validationErrors?: Record<string, string>;
};

type FetchBackendBlobOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function backendUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function fetchBackendBlob(
  path: string,
  options: FetchBackendBlobOptions = {},
) {
  const token = getAuthToken();
  const headers = new Headers();
  const abortController = new AbortController();
  const timeoutMs = options.timeoutMs ?? 0;
  let timeoutId: ReturnType<typeof window.setTimeout> | undefined;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  function abortFromCaller() {
    abortController.abort();
  }

  if (options.signal) {
    if (options.signal.aborted) {
      abortController.abort();
    } else {
      options.signal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = window.setTimeout(() => abortController.abort(), timeoutMs);
  }

  let response: Response;
  try {
    response = await fetch(backendUrl(path), {
      headers,
      signal: abortController.signal,
    });
  } catch (caught) {
    const abortedByTimeout = abortController.signal.aborted && !options.signal?.aborted;
    throw new ApiError(
      0,
      abortedByTimeout
        ? `Backend media request timed out after ${timeoutMs}ms`
        : `Backend unavailable at ${API_BASE_URL || "the Vite proxy"}`,
      caught,
    );
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
    options.signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    const parsed = await parseBody(response);
    throw new ApiError(
      response.status,
      errorMessage(response.status, parsed, response.statusText),
      parsed,
    );
  }

  return response.blob();
}

function errorMessage(status: number, body: unknown, fallbackText: string) {
  if (isApiErrorBody(body)) {
    const validation = body.validationErrors
      ? Object.entries(body.validationErrors)
          .map(([field, message]) => `${field}: ${message}`)
          .join("; ")
      : "";
    const main = body.message ?? body.error;
    return [main, validation].filter(Boolean).join(" ") || fallbackText;
  }

  return fallbackText || `Request failed with status ${status}`;
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null;
}

async function parseBody(response: Response) {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: JsonBody;
  } = {},
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (caught) {
    throw new ApiError(
      0,
      `Backend unavailable at ${API_BASE_URL || "the Vite /api proxy"}`,
      caught,
    );
  }

  const parsed = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessage(response.status, parsed, response.statusText),
      parsed,
    );
  }

  return parsed as T;
}

export function register(request: RegisterRequest) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: request,
  });
}

export function login(request: LoginRequest) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: request,
  });
}

export function startSession(request: StartSessionRequest) {
  return apiRequest<GameSessionResponse>("/api/game/sessions", {
    method: "POST",
    body: request,
  });
}

// Perception Ladder overview (NIL-42): floors in climb order with the caller's
// per-floor progress. Reuses the shared apiRequest (JWT + error handling).
export function getLadderFloors() {
  return apiRequest<LadderFloorsResponse>("/api/game/ladder/floors");
}

export function getNextRound(sessionUuid: string) {
  return apiRequest<NextRoundResponse>(
    `/api/game/sessions/${encodeURIComponent(sessionUuid)}/rounds/next`,
  );
}

export function submitAnswer(
  sessionUuid: string,
  request: SubmitAnswerRequest,
) {
  return apiRequest<AnswerResultResponse>(
    `/api/game/sessions/${encodeURIComponent(sessionUuid)}/answers`,
    {
      method: "POST",
      body: request,
    },
  );
}

export function getLeaderboard(page = 0, size = 10) {
  return apiRequest<LeaderboardPageResponse>(
    `/api/leaderboard?page=${page}&size=${size}`,
  );
}

export function getMyAttempts() {
  return apiRequest<AttemptResponse[]>("/api/game/me/attempts");
}

export function submitRating(request: RatingRequest) {
  return apiRequest<RatingResponse>("/api/ratings", {
    method: "POST",
    body: request,
  });
}

export function getMyRatings(page = 0, size = 50) {
  return apiRequest<RatingPageResponse>(
    `/api/game/me/ratings?page=${page}&size=${size}`,
  );
}

// The backend clamps size to 50, so 40 pages covers 2000 entries — far past
// the stimulus set for both walkers below. The cap only guards against a
// pathological totalPages.
const PAGE_WALK_MAX_PAGES = 40;

export async function getAllMyRatings(): Promise<RatingResponse[]> {
  const entries: RatingResponse[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < PAGE_WALK_MAX_PAGES) {
    const response = await getMyRatings(page);
    entries.push(...(response.entries ?? []));
    totalPages = response.totalPages ?? 0;
    page += 1;
  }

  return entries;
}

export function getRatableWords(page = 0, size = 50) {
  return apiRequest<RatableWordPageResponse>(
    `/api/game/me/ratable-words?page=${page}&size=${size}`,
  );
}

export async function getAllRatableWords(): Promise<RatableWordResponse[]> {
  const entries: RatableWordResponse[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < PAGE_WALK_MAX_PAGES) {
    const response = await getRatableWords(page);
    entries.push(...(response.entries ?? []));
    totalPages = response.totalPages ?? 0;
    page += 1;
  }

  return entries;
}

export function getDivergence() {
  return apiRequest<DivergenceEntry[]>("/api/research/divergence");
}

export function getRatingDistributions() {
  return apiRequest<RatingDistributionsResponse>(
    "/api/research/rating-distributions",
  );
}

export function getPositionBias() {
  return apiRequest<PositionBiasResponse>("/api/research/position-bias");
}
