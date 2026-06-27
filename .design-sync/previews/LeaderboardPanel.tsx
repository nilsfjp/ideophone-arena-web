// Authored preview — the leaderboard table. Renders the best *completed*
// session per player (correct / answered and accuracy). Takes its page data
// directly, so it shows real rows without a backend. Includes the empty state
// and the paged state (pager appears when totalPages > 1).
import { LeaderboardPanel } from "ideophone-arena-web";

const data = {
  entries: [
    { username: "hiro", bestSessionCorrect: 18, bestSessionAnswered: 20, bestSessionAccuracy: 0.9 },
    { username: "mei", bestSessionCorrect: 16, bestSessionAnswered: 20, bestSessionAccuracy: 0.8 },
    { username: "sora", bestSessionCorrect: 14, bestSessionAnswered: 20, bestSessionAccuracy: 0.7 },
    { username: "kenji", bestSessionCorrect: 11, bestSessionAnswered: 18, bestSessionAccuracy: 0.611 },
  ],
  page: 0,
  size: 10,
  totalElements: 4,
  totalPages: 1,
};

// Populated leaderboard with ranked players.
export const Populated = () => (
  <div style={{ maxWidth: 480 }}>
    <LeaderboardPanel data={data} onPageChange={() => {}} />
  </div>
);

// Paged: more than one page enables the Previous / Next pager.
export const Paged = () => (
  <div style={{ maxWidth: 480 }}>
    <LeaderboardPanel
      data={{ ...data, page: 1, totalElements: 34, totalPages: 4 }}
      onPageChange={() => {}}
    />
  </div>
);

// Empty: no completed sessions yet.
export const Empty = () => (
  <div style={{ maxWidth: 480 }}>
    <LeaderboardPanel
      data={{ entries: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }}
      onPageChange={() => {}}
    />
  </div>
);
