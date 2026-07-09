import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DivergenceEntry,
  LeaderboardPageResponse,
  PositionBiasResponse,
  RatableWordPageResponse,
  RatableWordResponse,
  RatingDistributionsResponse,
  RatingPageResponse,
  RatingResponse,
} from "./types";
import {
  ApiError,
  getAllMyProductions,
  getAllMyRatings,
  getAllRatableWords,
  getDivergence,
  getLeaderboard,
  getMyRatings,
  getNextProductionPrompt,
  getPositionBias,
  getRatableWords,
  getRatingDistributions,
  isUnparseableInput,
  submitProduction,
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

  it("carries the verbatim displayForm kana when present", async () => {
    const rows: DivergenceEntry[] = [
      {
        ideophoneId: 9,
        romaji: "dokidoki",
        displayForm: "どきどき",
        gloss: "heart pounding",
        modality: "INTEROCEPTIVE",
        guessAccuracy: 0.62,
        guessCount: 120,
        meanRating: 6.1,
        ratingCount: 18,
      },
    ];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(rows), { status: 200 }),
    );

    const result = await getDivergence();

    expect(result[0].displayForm).toBe("どきどき");
  });
});

describe("getRatingDistributions", () => {
  it("fetches the public dense per-modality 1–7 grid", async () => {
    const response: RatingDistributionsResponse = {
      distributions: [
        { modality: "AUDITORY", ratingValue: 1, count: 0 },
        { modality: "AUDITORY", ratingValue: 2, count: 3 },
        { modality: "VISUAL", ratingValue: 7, count: 5 },
      ],
      byModalityN: { AUDITORY: 42, VISUAL: 51 },
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    const result = await getRatingDistributions();

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/research/rating-distributions")).toBe(
      true,
    );
    expect(result).toEqual(response);
    expect(result.byModalityN.AUDITORY).toBe(42);
  });
});

describe("getPositionBias", () => {
  it("fetches the SDT fairness object, preserving nulls and dPrime casing", async () => {
    const response: PositionBiasResponse = {
      n: 612,
      leftPickCount: 312,
      rightPickCount: 300,
      leftPickRate: 0.51,
      dPrime: 1.42,
      criterion: -0.03,
      targetTopN: 305,
      targetTopCorrect: 192,
      targetTopAccuracy: 0.63,
      targetBottomN: 307,
      targetBottomCorrect: 187,
      targetBottomAccuracy: 0.609,
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    const result = await getPositionBias();

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl.endsWith("/api/research/position-bias")).toBe(true);
    expect(result.dPrime).toBe(1.42);
    expect(result.criterion).toBe(-0.03);
  });

  it("preserves null rates when a denominator is empty", async () => {
    const response: PositionBiasResponse = {
      n: 0,
      leftPickCount: 0,
      rightPickCount: 0,
      leftPickRate: null,
      dPrime: null,
      criterion: null,
      targetTopN: 0,
      targetTopCorrect: 0,
      targetTopAccuracy: null,
      targetBottomN: 0,
      targetBottomCorrect: 0,
      targetBottomAccuracy: null,
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    const result = await getPositionBias();

    expect(result.leftPickRate).toBeNull();
    expect(result.dPrime).toBeNull();
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

describe("getNextProductionPrompt", () => {
  it("returns the prompt with the producible total", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          completed: false,
          ideophoneId: 1,
          gloss: "with a rustling sound",
          modality: "AUDITORY",
          totalProducible: 94,
        }),
        { status: 200 },
      ),
    );

    const prompt = await getNextProductionPrompt();

    expect(String(fetchMock.mock.calls[0][0]).endsWith("/api/productions/next")).toBe(
      true,
    );
    expect(prompt.totalProducible).toBe(94);
    expect(prompt.completed).toBe(false);
  });

  it("passes the completion sentinel through", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          completed: true,
          ideophoneId: null,
          gloss: null,
          modality: null,
          totalProducible: 94,
        }),
        { status: 200 },
      ),
    );

    const prompt = await getNextProductionPrompt();

    expect(prompt.completed).toBe(true);
    expect(prompt.ideophoneId).toBeNull();
    expect(prompt.totalProducible).toBe(94);
  });
});

describe("submitProduction", () => {
  it("POSTs the minted word and returns the scored reveal", async () => {
    const reveal = {
      id: 40,
      ideophoneId: 60,
      input: "pikapika",
      similarityScore: 78,
      features: [{ feature: "redup", yours: true, target: true, matched: true }],
      target: {
        displayForm: "どきどき",
        romaji: "dokidoki",
        gloss: "with a rapid heartbeat",
        stimulusUrl: "/stimuli/audio/i9h-dokidoki.m4a",
      },
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(reveal), { status: 201 }),
    );

    const result = await submitProduction({
      ideophoneId: 60,
      input: "pikapika",
      responseTimeMs: 5200,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url).endsWith("/api/productions")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      ideophoneId: 60,
      input: "pikapika",
      responseTimeMs: 5200,
    });
    expect(result.similarityScore).toBe(78);
    expect(result.target.displayForm).toBe("どきどき");
  });

  it("throws a 409 ApiError when the word was already minted", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "This ideophone has already been produced by this user" }),
        { status: 409 },
      ),
    );

    await expect(
      submitProduction({ ideophoneId: 60, input: "pikapika", responseTimeMs: 10 }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("isUnparseableInput", () => {
  it("recognises the 400 that leaves the attempt unconsumed", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ validationErrors: { input: "must segment into morae" } }),
        { status: 400 },
      ),
    );

    const caught = await submitProduction({
      ideophoneId: 60,
      input: "ngrk",
      responseTimeMs: 10,
    }).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ApiError);
    expect(isUnparseableInput(caught)).toBe(true);
    // The player never sees this text — the frozen §8.1 helper is rendered
    // instead — but the flattened message proves why .message is unusable.
    expect((caught as ApiError).message).toContain("input:");
  });

  it("rejects a 400 without a field error, a 409, and non-ApiErrors", () => {
    expect(isUnparseableInput(new ApiError(400, "bad request", { message: "bad" }))).toBe(
      false,
    );
    expect(isUnparseableInput(new ApiError(409, "conflict", {}))).toBe(false);
    expect(isUnparseableInput(new Error("boom"))).toBe(false);
    expect(isUnparseableInput(null)).toBe(false);
  });
});

describe("getAllMyProductions", () => {
  it("walks every page of the caller's own productions", async () => {
    const page = (pageNumber: number, totalPages: number) =>
      new Response(
        JSON.stringify({
          entries: [
            {
              id: pageNumber,
              ideophoneId: pageNumber,
              input: "pika",
              similarityScore: 50 + pageNumber,
              createdAt: "2026-07-09T12:00:00Z",
            },
          ],
          page: pageNumber,
          size: 50,
          totalElements: totalPages,
          totalPages,
        }),
        { status: 200 },
      );
    fetchMock
      .mockResolvedValueOnce(page(0, 2))
      .mockResolvedValueOnce(page(1, 2));

    const entries = await getAllMyProductions();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/game/me/productions?page=0&size=50",
    );
    expect(entries.map((entry) => entry.similarityScore)).toEqual([50, 51]);
  });
});
