import { useEffect, useState } from "react";
import { ApiError, getLeaderboard, getMyAttempts } from "../api/client";
import type { AttemptResponse, LeaderboardPageResponse } from "../api/types";

type LeaderboardProps = {
  isAuthenticated: boolean;
  refreshKey: number;
  view?: "leaderboard" | "attempts" | "both";
  onAuthExpired: (message: string) => void;
};

export default function Leaderboard({
  isAuthenticated,
  refreshKey,
  view = "both",
  onAuthExpired,
}: LeaderboardProps) {
  const [leaderboardPage, setLeaderboardPage] =
    useState<LeaderboardPageResponse | null>(null);
  const [page, setPage] = useState(0);
  const [attempts, setAttempts] = useState<AttemptResponse[]>([]);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [attemptsError, setAttemptsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      setLeaderboardError("");

      try {
        const response = await getLeaderboard(page);
        if (isMounted) {
          setLeaderboardPage(response);
        }
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }

        if (isMounted) {
          setLeaderboardError(
            caught instanceof Error ? caught.message : "Leaderboard failed",
          );
        }
      }
    }

    async function loadAttempts() {
      if (!isAuthenticated) {
        if (isMounted) {
          setAttempts([]);
          setAttemptsError("");
        }
        return;
      }

      setAttemptsError("");

      try {
        const recentAttempts = await getMyAttempts();
        if (isMounted) {
          setAttempts(recentAttempts);
        }
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }

        if (isMounted) {
          setAttemptsError(
            caught instanceof Error ? caught.message : "Attempts failed",
          );
        }
      }
    }

    void loadLeaderboard();
    void loadAttempts();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, onAuthExpired, page, refreshKey]);

  const showLeaderboard = view === "leaderboard" || view === "both";
  const showAttempts = isAuthenticated && (view === "attempts" || view === "both");

  return (
    <section className="score-section" aria-label="Completion scores and history">
      {showLeaderboard ? (
        <div
          className="score-column"
          id="leaderboard-panel"
          role={view === "both" ? undefined : "tabpanel"}
          aria-labelledby="leaderboard-title"
        >
          <LeaderboardPanel data={leaderboardPage} onPageChange={setPage} />

          {leaderboardError ? <p className="error-text">{leaderboardError}</p> : null}
        </div>
      ) : null}

      {showAttempts ? (
        <div
          className="score-column"
          id="attempts-panel"
          role={view === "both" ? undefined : "tabpanel"}
          aria-labelledby="attempts-title"
        >
          <h2 id="attempts-title">Recent Attempts</h2>
          {attempts.length > 0 ? (
            <ul className="attempt-list">
              {attempts.slice(0, 5).map((attempt, index) => (
                <li key={`${attempt.answeredAt ?? "attempt"}-${index}`}>
                  <span>{attempt.correct ? "Correct" : "Incorrect"}</span>
                  <strong>
                    {attempt.targetTranslation ?? attempt.prompt ?? "Round"}
                  </strong>
                  <span>
                    {attempt.selectedKana}
                    {attempt.correctKana ? ` / ${attempt.correctKana}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No attempts yet.</p>
          )}

          {attemptsError ? <p className="error-text">{attemptsError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

type LeaderboardPanelProps = {
  data: LeaderboardPageResponse | null;
  onPageChange: (page: number) => void;
};

// Pure render of one leaderboard page; the stateful wrapper above owns
// fetching and the current page index.
export function LeaderboardPanel({ data, onPageChange }: LeaderboardPanelProps) {
  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? 0;

  return (
    <>
      <h2 id="leaderboard-title">Leaderboard</h2>
      {entries.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Best session</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.username}>
                <td>{entry.username}</td>
                <td>
                  {entry.bestSessionCorrect} / {entry.bestSessionAnswered}
                </td>
                <td>{Math.round(entry.bestSessionAccuracy * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No scores yet.</p>
      )}

      {totalPages > 1 ? (
        <nav className="leaderboard-pager" aria-label="Leaderboard pages">
          <button
            className="secondary-button"
            type="button"
            disabled={currentPage <= 0}
            onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
          >
            Previous
          </button>
          <span>
            page {currentPage + 1} of {totalPages}
          </span>
          <button
            className="secondary-button"
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
          >
            Next
          </button>
        </nav>
      ) : null}
    </>
  );
}
