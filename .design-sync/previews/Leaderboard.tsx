// Authored preview — the leaderboard + personal-attempts section. This is the
// live, data-fetching wrapper (it calls the backend on mount); LeaderboardPanel
// is the presentational table you'd compose with data you already have. With no
// backend it renders its section chrome and empty/placeholder states. Shown here
// in leaderboard-only view, unauthenticated (no personal attempts column).
import { Leaderboard } from "ideophone-arena-web";

export const Section = () => (
  <div style={{ maxWidth: 520 }}>
    <Leaderboard
      isAuthenticated={false}
      refreshKey={0}
      view="leaderboard"
      onAuthExpired={() => {}}
    />
  </div>
);
