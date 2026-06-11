import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardPageResponse } from "./types";
import { getLeaderboard } from "./client";

const wrapper: LeaderboardPageResponse = {
  entries: [
    { username: "demo", totalAnswered: 30, totalCorrect: 21, accuracy: 0.7 },
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
