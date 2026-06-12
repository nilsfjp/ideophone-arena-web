import { useCallback, useState } from "react";
import {
  ApiError,
  clearAuthToken,
  getNextRound,
  setAuthToken,
  startSession,
} from "./api/client";
import type {
  AnswerResultResponse,
  AuthResponse,
  ConditionName,
  GameSessionResponse,
  RoundResponse,
  StartSessionRequest,
} from "./api/types";
import AuthForm from "./components/AuthForm";
import Instructions from "./components/Instructions";
import Leaderboard from "./components/Leaderboard";
import TrialPlayer from "./components/TrialPlayer";

const USERNAME_STORAGE_KEY = "ideophone-arena-username";
const ROLE_STORAGE_KEY = "ideophone-arena-role";
const DEMO_DIFFICULTY_LEVEL = 1;
const DEFAULT_SCRIPT_LAB_CONDITION: ConditionName = "CONDITION_1_SOKUON";
const DEMO_TOTAL_ROUNDS = 30;

type AuthState = {
  username: string;
  role?: string;
};

type AppView = "auth" | "instructions" | "game";
type SoundCheckStatus = "idle" | "checking" | "ready" | "error";
type CompletionScoreView = "leaderboard" | "attempts";

export type SessionStats = {
  answered: number;
  correct: number;
};

const EMPTY_SESSION_STATS: SessionStats = {
  answered: 0,
  correct: 0,
};

function readStoredAuth(): AuthState | null {
  const username = localStorage.getItem(USERNAME_STORAGE_KEY);
  if (!username) {
    return null;
  }

  return {
    username,
    role: localStorage.getItem(ROLE_STORAGE_KEY) ?? undefined,
  };
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [view, setView] = useState<AppView>(() =>
    readStoredAuth() ? "instructions" : "auth",
  );
  const [session, setSession] = useState<GameSessionResponse | null>(null);
  const [round, setRound] = useState<RoundResponse | null>(null);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [scoreRefreshKey, setScoreRefreshKey] = useState(0);
  const [latestResult, setLatestResult] = useState<AnswerResultResponse | null>(
    null,
  );
  const [sessionStats, setSessionStats] =
    useState<SessionStats>(EMPTY_SESSION_STATS);
  const [soundCheckStatus, setSoundCheckStatus] =
    useState<SoundCheckStatus>("idle");
  const [soundCheckError, setSoundCheckError] = useState("");
  const [completionScoreView, setCompletionScoreView] =
    useState<CompletionScoreView>("leaderboard");
  const [selectedCondition, setSelectedCondition] = useState<ConditionName>(
    DEFAULT_SCRIPT_LAB_CONDITION,
  );
  // UI default is ON; the backend default stays false, so the flag is always
  // sent explicitly and only this opt-in produces practice rounds.
  const [includePractice, setIncludePractice] = useState(true);

  function handleAuthenticated(response: AuthResponse) {
    setAuthToken(response.token);
    localStorage.setItem(USERNAME_STORAGE_KEY, response.username ?? "player");
    if (response.role) {
      localStorage.setItem(ROLE_STORAGE_KEY, response.role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
    setAuth({ username: response.username ?? "player", role: response.role });
    setView("instructions");
    setError("");
  }

  const handleLogout = useCallback(() => {
    clearAuthToken();
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    setAuth(null);
    setView("auth");
    setSession(null);
    setRound(null);
    setError("");
    setSessionComplete(false);
    setLatestResult(null);
    setSessionStats(EMPTY_SESSION_STATS);
    setScoreRefreshKey(0);
    setCompletionScoreView("leaderboard");
    setSelectedCondition(DEFAULT_SCRIPT_LAB_CONDITION);
    setIncludePractice(true);
  }, []);

  const handleBackToStart = useCallback(() => {
    setSession(null);
    setRound(null);
    setSessionComplete(false);
    setLatestResult(null);
    setSessionStats(EMPTY_SESSION_STATS);
    setError("");
    setView("instructions");
    setCompletionScoreView("leaderboard");
  }, []);

  const handleAuthExpired = useCallback(
    (message: string) => {
      handleLogout();
      setError(message || "Please log in again.");
    },
    [handleLogout],
  );

  const loadNextRound = useCallback(
    async (sessionUuid: string) => {
      setIsLoadingRound(true);
      setError("");

      try {
        const nextRound = await getNextRound(sessionUuid);
        if (isCompletionPayload(nextRound)) {
          setSession(null);
          setRound(null);
          setSessionComplete(true);
          return;
        }

        if (!isPlayableRound(nextRound)) {
          throw new ApiError(
            422,
            "The backend returned an invalid or unplayable round.",
            nextRound,
          );
        }

        setRound(nextRound);
        setSessionComplete(false);
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          handleAuthExpired(caught.message);
          return;
        }

        if (isCompletionError(caught)) {
          setSession(null);
          setRound(null);
          setSessionComplete(true);
          return;
        }

        setSession(null);
        setRound(null);
        setSessionComplete(false);
        setError(caught instanceof Error ? caught.message : "Round failed to load");
      } finally {
        setIsLoadingRound(false);
      }
    },
    [handleAuthExpired],
  );

  async function handleStart() {
    if (soundCheckStatus !== "ready") {
      setError("Run the sound check before starting the game.");
      return;
    }

    setIsStarting(true);
    setError("");
    setSessionComplete(false);
    setLatestResult(null);
    setSessionStats(EMPTY_SESSION_STATS);
    setRound(null);
    setSession(null);
    setScoreRefreshKey(0);
    setCompletionScoreView("leaderboard");

    try {
      const sessionRequest: StartSessionRequest = {
        difficultyLevel: DEMO_DIFFICULTY_LEVEL,
        conditionName: selectedCondition,
        includePractice,
      };
      const createdSession = await startSession(sessionRequest);
      setSession(createdSession);
      setView("game");
      await loadNextRound(createdSession.sessionUuid);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        handleAuthExpired(caught.message);
        return;
      }

      setError(caught instanceof Error ? caught.message : "Game failed to start");
    } finally {
      setIsStarting(false);
    }
  }

  function handleAnswered(result: AnswerResultResponse) {
    if (result.practice) {
      // Practice feedback shows in-trial only; session stats and score views
      // stay at their pre-game state until the first scored answer.
      return;
    }

    setLatestResult(result);
    setSessionStats((current) => ({
      answered: current.answered + 1,
      correct: current.correct + (result.correct ? 1 : 0),
    }));
    setScoreRefreshKey((key) => key + 1);
  }

  async function handleSoundCheck() {
    setSoundCheckStatus("checking");
    setSoundCheckError("");
    setError("");

    try {
      await playSoundCheckTone();
      setSoundCheckStatus("ready");
    } catch (caught) {
      setSoundCheckStatus("error");
      setSoundCheckError(
        caught instanceof Error ? caught.message : "Sound check failed",
      );
    }
  }

  function renderMain() {
    if (!auth || view === "auth") {
      return <AuthForm onAuthenticated={handleAuthenticated} />;
    }

    if (isStarting && !session) {
      return <p className="status-text">Starting new game...</p>;
    }

    if (view === "instructions") {
      return (
        <Instructions
          difficultyLevel={DEMO_DIFFICULTY_LEVEL}
          error={error}
          includePractice={includePractice}
          isStarting={isStarting}
          selectedCondition={selectedCondition}
          soundCheckError={soundCheckError}
          soundCheckStatus={soundCheckStatus}
          onConditionChange={setSelectedCondition}
          onIncludePracticeChange={setIncludePractice}
          onSoundCheck={() => void handleSoundCheck()}
          onStart={handleStart}
        />
      );
    }

    if (sessionComplete) {
      const finalScore = `${sessionStats.correct} / ${sessionStats.answered}`;
      const finalMessage = latestResult
        ? latestResult.correct
          ? "Last answer was correct."
          : "Last answer was incorrect."
        : "The session finished cleanly.";

      return (
        <>
          <section className="complete-panel">
            <h1>Session complete</h1>
            <p>{finalMessage}</p>

            <dl className="completion-summary">
              <dt>Session score</dt>
              <dd>{finalScore}</dd>
              <dt>Session answered</dt>
              <dd>{sessionStats.answered}</dd>
              <dt>Account total correct</dt>
              <dd>{latestResult ? latestResult.totalCorrect : "Unavailable"}</dd>
              <dt>Account total answered</dt>
              <dd>{latestResult ? latestResult.totalAnswered : "Unavailable"}</dd>
            </dl>

            <div className="completion-actions">
              <button className="primary-button" type="button" onClick={handleStart}>
                Play again
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setCompletionScoreView("leaderboard")}
              >
                View leaderboard
              </button>
              {auth ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setCompletionScoreView("attempts")}
                >
                  View my attempts
                </button>
              ) : null}
            </div>
          </section>

          <div
            className="completion-tabs"
            role="tablist"
            aria-label="Completion score views"
          >
            <button
              aria-controls="leaderboard-panel"
              aria-selected={completionScoreView === "leaderboard"}
              className={
                completionScoreView === "leaderboard"
                  ? "tab-button active"
                  : "tab-button"
              }
              role="tab"
              type="button"
              onClick={() => setCompletionScoreView("leaderboard")}
            >
              Leaderboard
            </button>
            {auth ? (
              <button
                aria-controls="attempts-panel"
                aria-selected={completionScoreView === "attempts"}
                className={
                  completionScoreView === "attempts"
                    ? "tab-button active"
                    : "tab-button"
                }
                role="tab"
                type="button"
                onClick={() => setCompletionScoreView("attempts")}
              >
                Recent attempts
              </button>
            ) : null}
          </div>

          <Leaderboard
            isAuthenticated={Boolean(auth)}
            refreshKey={scoreRefreshKey}
            view={completionScoreView}
            onAuthExpired={handleAuthExpired}
          />
        </>
      );
    }

    if (isLoadingRound && !round) {
      return <p className="status-text">Loading next round...</p>;
    }

    if (session && round) {
      return (
        <TrialPlayer
          key={`${session.sessionUuid}:${round.roundId}`}
          round={round}
          sessionStats={sessionStats}
          sessionUuid={session.sessionUuid}
          totalRounds={DEMO_TOTAL_ROUNDS}
          onAnswered={handleAnswered}
          onAuthExpired={handleAuthExpired}
          onNeedNextRound={() => void loadNextRound(session.sessionUuid)}
          onBackToStart={handleBackToStart}
        />
      );
    }

    return (
      <section className="complete-panel">
        <h1>Ready</h1>
        <p>Start a session to fetch the first round.</p>
        {error ? <p className="error-text centered">{error}</p> : null}
        <div className="completion-actions">
          <button className="primary-button" type="button" onClick={handleStart}>
            Start New Game
          </button>
          {error ? (
            <button className="secondary-button" type="button" onClick={handleBackToStart}>
              Back to start
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <button
          className="site-title"
          type="button"
          onClick={() => setView(auth ? "instructions" : "auth")}
        >
          Ideophone Arena
        </button>

        {auth ? (
          <div className="user-controls">
            <span>{auth.username}</span>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : null}
      </header>

      <main className="site-main">
        {error && (!auth || view === "auth") ? (
          <p className="error-text centered">{error}</p>
        ) : null}
        {renderMain()}
      </main>
    </div>
  );
}

async function playSoundCheckTone() {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    throw new Error("This browser does not support the Web Audio API.");
  }

  const audioContext = new AudioContextCtor();

  try {
    await audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);

    await new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(resolve, 600);
      oscillator.onended = () => resolve();
      oscillator.addEventListener(
        "ended",
        () => window.clearTimeout(timeoutId),
        { once: true },
      );
    });
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}

function isPlayableRound(round: unknown): round is RoundResponse {
  if (typeof round !== "object" || round === null) {
    return false;
  }

  const candidate = round as Partial<RoundResponse>;
  if (!candidate.roundId) {
    return false;
  }

  const targetTranslation =
    candidate.targetTranslation ??
    candidate.prompt ??
    candidate.translations?.target ??
    "";
  if (!targetTranslation.trim()) {
    return false;
  }

  if (!candidate.left?.ideophoneId || !candidate.right?.ideophoneId) {
    return false;
  }

  const hasPlayableStimulus = (option: RoundResponse["left"]) =>
    Boolean(option?.stimulusUrl || option?.stimulusFile);

  return hasPlayableStimulus(candidate.left) && hasPlayableStimulus(candidate.right);
}

function isCompletionPayload(payload: unknown) {
  if (payload === null || payload === undefined) {
    return true;
  }

  if (typeof payload !== "object") {
    return false;
  }

  const completion = payload as {
    complete?: unknown;
    completed?: unknown;
    sessionComplete?: unknown;
    message?: unknown;
    status?: unknown;
  };

  if (
    completion.complete === true ||
    completion.completed === true ||
    completion.sessionComplete === true
  ) {
    return true;
  }

  const message = [completion.message, completion.status]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return /complete|completed|finished|no\s+more|no\s+next|no\s+unanswered/i.test(
    message,
  );
}

function isCompletionError(caught: unknown) {
  if (!(caught instanceof ApiError) || caught.status !== 404) {
    return false;
  }

  const body = caught.body;
  const bodyMessage =
    typeof body === "string"
      ? body
      : isErrorMessageBody(body)
        ? [body.message, body.error].filter(Boolean).join(" ")
        : "";
  const message = `${caught.message} ${bodyMessage}`;

  return /complete|completed|finished|no\s+more|no\s+next|no\s+unanswered/i.test(
    message,
  );
}

function isErrorMessageBody(
  body: unknown,
): body is { message?: string; error?: string } {
  return typeof body === "object" && body !== null;
}
