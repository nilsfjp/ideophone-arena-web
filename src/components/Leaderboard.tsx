import { useEffect, useState } from "react";
import { ApiError, getLeaderboard, getMyAttempts } from "../api/client";
import type { AttemptResponse, LeaderboardEntry } from "../api/types";

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [attempts, setAttempts] = useState<AttemptResponse[]>([]);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [attemptsError, setAttemptsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      setLeaderboardError("");

      try {
        const entries = await getLeaderboard();
        if (isMounted) {
          setLeaderboard(entries);
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
  }, [isAuthenticated, onAuthExpired, refreshKey]);

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
          <h2 id="leaderboard-title">Leaderboard</h2>
          {leaderboard.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Account total correct</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.username}>
                    <td>{entry.username}</td>
                    <td>
                      {entry.totalCorrect} / {entry.totalAnswered}
                    </td>
                    <td>{Math.round(entry.accuracy * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No scores yet.</p>
          )}

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
