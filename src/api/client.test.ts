import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DivergenceEntry,
  LeaderboardPageResponse,
  RatableWordPageResponse,
  RatableWordResponse,
  RatingPageResponse,
  RatingResponse,
} from "./types";
import {
  ApiError,
  getAllMyRatings,
  getAllRatableWords,
  getDivergence,
  getLeaderboard,
  getMyRatings,
  getRatableWords,
  submitRating,
} from "./client";

const wrapper: LeaderboardPageResponse = {
  entries: [
    {
      username: "demo",
      bestSessionCorrect: 21,
      bestSessionAnswered: 30,
      bestSessionAccuracy: 0.7,
    },
  ],
  page: 0,
  size: 10,
  totalElements: 4,
  totalPages: 1,
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(wrapper), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ratingResponse: RatingResponse = {
  id: 42,
  ideophoneId: 7,
  rating: 6,
  responseTimeMs: 1500,
  ratedAt: "2026-07-02T12:34:56Z",
};

function ratingPage(overrides: Partial<RatingPageResponse>): RatingPageResponse {
  return {
    entries: [ratingResponse],
    page: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

describe("submitRating", () => {
  it("POSTs the rating payload as JSON to /api/ratings", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(ratingResponse), { status: 201 }),
    );

    const result = await submitRating({
      ideophoneId: 7,
      rating: 6,
      responseTimeMs: 1500,
      sessionUuid: "session-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url).endsWith("/api/ratings")).toBe(true);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      ideophoneId: 7,
      rating: 6,
      responseTimeMs: 1500,
      sessionUuid: "session-1",
    });
    expect(result).toEqual(ratingResponse);
  });

  it("surfaces a duplicate rating as ApiError with status 409", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "This ideophone has already been rated by this user",
        }),
        { status: 409 },
      ),
    );

    const caught = await submitRating({ ideophoneId: 7, rating: 6 }).catch(
      (error: unknown) => error,
    );

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
  });
});

describe("getMyRatings", () => {
  it("requests page 0 with size 50 by default and returns the paginated wrapper", async () => {
    const wrapperResponse = ratingPage({});
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(wrapperResponse), { status: 200 }),
    );

    const result = await getMyRatings();

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/game/me/ratings?page=0&size=50")).toBe(
      true,
    );
    expect(result).toEqual(wrapperResponse);
  });

  it("passes explicit page and size params through to the backend", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(ratingPage({ page: 2, size: 10 })), {
        status: 200,
      }),
    );

    await getMyRatings(2, 10);

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/game/me/ratings?page=2&size=10")).toBe(
      true,
    );
  });
});

describe("getAllMyRatings", () => {
  it("walks every page and concatenates the entries", async () => {
    const second: RatingResponse = { ...ratingResponse, id: 43, ideophoneId: 8 };
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(ratingPage({ totalPages: 2, totalElements: 2 })),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            ratingPage({
              entries: [second],
              page: 1,
              totalPages: 2,
              totalElements: 2,
            }),
          ),
          { status: 200 },
        ),
      );

    const result = await getAllMyRatings();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0]).includes("page=0")).toBe(true);
    expect(String(fetchMock.mock.calls[1][0]).includes("page=1")).toBe(true);
    expect(result.map((entry) => entry.id)).toEqual([42, 43]);
  });

  it("returns an empty list when the caller has no ratings", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          ratingPage({ entries: [], totalElements: 0, totalPages: 0 }),
        ),
        { status: 200 },
      ),
    );

    expect(await getAllMyRatings()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

const ratableWord: RatableWordResponse = {
  ideophoneId: 7,
  canonicalForm: "カンカン",
  romaji: "kankan",
  stimulusFile: "audio/a0a-kankan.m4a",
  modality: "AUDITORY",
  meaning: "clanging, banging",
};

function ratablePage(
  overrides: Partial<RatableWordPageResponse>,
): RatableWordPageResponse {
  return {
    entries: [ratableWord],
    page: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

describe("getRatableWords", () => {
  it("requests page 0 with size 50 by default and returns the paginated wrapper", async () => {
    const wrapperResponse = ratablePage({});
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(wrapperResponse), { status: 200 }),
    );

    const result = await getRatableWords();

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(
      requestedUrl.endsWith("/api/game/me/ratable-words?page=0&size=50"),
    ).toBe(true);
    expect(result).toEqual(wrapperResponse);
  });

  it("passes explicit page and size params through to the backend", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(ratablePage({ page: 1, size: 10 })), {
        status: 200,
      }),
    );

    await getRatableWords(1, 10);

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(
      requestedUrl.endsWith("/api/game/me/ratable-words?page=1&size=10"),
    ).toBe(true);
  });
});

describe("getAllRatableWords", () => {
  it("walks every page and concatenates the entries", async () => {
    const second: RatableWordResponse = {
      ...ratableWord,
      ideophoneId: 9,
      romaji: "gosogoso",
      meaning: "rustling",
    };
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(ratablePage({ totalPages: 2, totalElements: 2 })),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            ratablePage({
              entries: [second],
              page: 1,
              totalPages: 2,
              totalElements: 2,
            }),
          ),
          { status: 200 },
        ),
      );

    const result = await getAllRatableWords();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0]).includes("page=0")).toBe(true);
    expect(String(fetchMock.mock.calls[1][0]).includes("page=1")).toBe(true);
    expect(result.map((entry) => entry.ideophoneId)).toEqual([7, 9]);
  });

  it("returns an empty list when the caller has nothing to rate", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          ratablePage({ entries: [], totalElements: 0, totalPages: 0 }),
        ),
        { status: 200 },
      ),
    );

    expect(await getAllRatableWords()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getDivergence", () => {
  it("fetches the public divergence rows as a bare array", async () => {
    const rows: DivergenceEntry[] = [
      {
        ideophoneId: 7,
        romaji: "kankan",
        gloss: "clanging, banging",
        modality: "AUDITORY",
        guessAccuracy: 0.72,
        guessCount: 25,
        meanRating: 6,
        ratingCount: 4,
      },
      {
        ideophoneId: 9,
        romaji: "gosogoso",
        gloss: "rustling",
        modality: "AUDITORY",
        guessAccuracy: null,
        guessCount: 0,
        meanRating: 3.5,
        ratingCount: 2,
      },
    ];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(rows), { status: 200 }),
    );

    const result = await getDivergence();

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/research/divergence")).toBe(true);
    expect(result).toEqual(rows);
    expect(result[1].guessAccuracy).toBeNull();
  });
});

describe("getLeaderboard", () => {
  it("requests page 0 with size 10 by default and returns the paginated wrapper", async () => {
    const result = await getLeaderboard();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/leaderboard?page=0&size=10")).toBe(true);
    expect(result).toEqual(wrapper);
    expect(result.entries[0].username).toBe("demo");
  });

  it("passes explicit page and size params through to the backend", async () => {
    await getLeaderboard(2, 25);

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/leaderboard?page=2&size=25")).toBe(true);
  });
});
