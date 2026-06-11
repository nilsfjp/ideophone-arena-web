import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LeaderboardPageResponse } from "../api/types";
import { LeaderboardPanel } from "./Leaderboard";

function makePage(
  overrides: Partial<LeaderboardPageResponse> = {},
): LeaderboardPageResponse {
  return {
    entries: [
      { username: "alpha", totalAnswered: 30, totalCorrect: 24, accuracy: 0.8 },
      { username: "beta", totalAnswered: 30, totalCorrect: 18, accuracy: 0.6 },
    ],
    page: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
    ...overrides,
  };
}

function renderPanel(data: LeaderboardPageResponse | null) {
  return renderToStaticMarkup(
    <LeaderboardPanel data={data} onPageChange={() => {}} />,
  );
}

describe("LeaderboardPanel", () => {
  it("renders one table row per entry from the wrapper's entries field", () => {
    const markup = renderPanel(makePage());

    expect(markup).toContain("alpha");
    expect(markup).toContain("24 / 30");
    expect(markup).toContain("80%");
    expect(markup).toContain("beta");
    expect(markup).toContain("60%");
  });

  it("hides the pager when totalPages is 1 or less", () => {
    expect(renderPanel(makePage({ totalPages: 1 }))).not.toContain(
      "leaderboard-pager",
    );
    expect(renderPanel(makePage({ totalPages: 0, entries: [] }))).not.toContain(
      "leaderboard-pager",
    );
  });

  it("shows a 1-indexed pager with Previous disabled on the first page", () => {
    const markup = renderPanel(
      makePage({ page: 0, totalPages: 3, totalElements: 25 }),
    );

    expect(markup).toContain("page 1 of 3");
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Previous<\/button>/);
    expect(markup).not.toMatch(/<button[^>]*disabled[^>]*>Next<\/button>/);
  });

  it("disables Next on the last page and enables Previous", () => {
    const markup = renderPanel(
      makePage({ page: 2, totalPages: 3, totalElements: 25 }),
    );

    expect(markup).toContain("page 3 of 3");
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Next<\/button>/);
    expect(markup).not.toMatch(/<button[^>]*disabled[^>]*>Previous<\/button>/);
  });

  it("shows the empty state before data arrives", () => {
    expect(renderPanel(null)).toContain("No scores yet.");
  });
});
