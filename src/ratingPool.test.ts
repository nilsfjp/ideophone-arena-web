import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  RatableWordPageResponse,
  RatableWordResponse,
} from "./api/types";
import { fetchRatingPool } from "./ratingPool";

const kankan: RatableWordResponse = {
  ideophoneId: 7,
  canonicalForm: "カンカン",
  romaji: "kankan",
  stimulusFile: "audio/a0a-kankan.m4a",
  modality: "AUDITORY",
  meaning: "clanging, banging",
};

const gosogoso: RatableWordResponse = {
  ideophoneId: 9,
  canonicalForm: "ごそごそ",
  romaji: "gosogoso",
  stimulusFile: "audio/a0h-gosogoso.m4a",
  modality: "AUDITORY",
  meaning: "rustling",
};

function page(
  overrides: Partial<RatableWordPageResponse>,
): RatableWordPageResponse {
  return {
    entries: [kankan],
    page: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
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

// The pool is a thin client of GET /api/game/me/ratable-words since 27E: the
// backend enforces the contamination rule (answered rounds only, rated words
// excluded) and owns encounter order, so these tests only cover the fetch
// plumbing — there is no localStorage path left to test.
describe("fetchRatingPool", () => {
  it("fetches the server pool from the ratable-words endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(page({})), { status: 200 }),
    );

    const pool = await fetchRatingPool();

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(
      requestedUrl.endsWith("/api/game/me/ratable-words?page=0&size=50"),
    ).toBe(true);
    expect(pool).toEqual([kankan]);
  });

  it("walks every page and preserves the server's encounter order", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(page({ totalPages: 2, totalElements: 2 })),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            page({
              entries: [gosogoso],
              page: 1,
              totalPages: 2,
              totalElements: 2,
            }),
          ),
          { status: 200 },
        ),
      );

    const pool = await fetchRatingPool();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pool.map((word) => word.ideophoneId)).toEqual([7, 9]);
  });

  it("returns an empty pool for an account with nothing to rate", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(page({ entries: [], totalElements: 0, totalPages: 0 })),
        { status: 200 },
      ),
    );

    expect(await fetchRatingPool()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
