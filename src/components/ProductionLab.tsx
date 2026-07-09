import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  backendUrl,
  getAllMyProductions,
  getNextProductionPrompt,
  submitProduction,
} from "../api/client";
import type { ProductionPrompt, ProductionResponse } from "../api/types";
import {
  MINT_BACK_BUTTON,
  MINT_INSTRUCTION,
  MINT_NEXT_BUTTON,
  MINT_ONE_SHOT_LABEL,
  MINT_ONE_SHOT_SUPPORT,
  MINT_PARSE_ERROR_BETWEEN,
  MINT_PARSE_ERROR_EXAMPLE_ONE,
  MINT_PARSE_ERROR_EXAMPLE_TWO,
  MINT_PARSE_ERROR_PREFIX,
  MINT_PARSE_ERROR_SUFFIX,
  MINT_REVEAL_PREFIX,
  MINT_REVEAL_SUFFIX,
  MINT_SCORE_LABEL,
  MINT_STATUS_MEAN_PREFIX,
  MINT_STATUS_OF,
  MINT_STATUS_WORD_PREFIX,
  MINT_SUBMIT_BUTTON,
  MINT_YOURS_PREFIX,
  MINT_YOURS_SUFFIX,
  RATING_REPLAY_BUTTON,
} from "../experimentText";
import {
  chipLabel,
  chipsFor,
  featureTableLabel,
  featureTableValue,
  isMintInputWellFormed,
  normalizeMintInput,
  scoreBandTail,
} from "../productionScore";
import { classifySubmitError } from "../productionSubmit";
import StimulusPlayback from "./StimulusPlayback";

type ProductionLabProps = {
  onAuthExpired: (message: string) => void;
  onBackToHome: () => void;
};

type MintPhase = "loading" | "prompt" | "submitting" | "revealed" | "done" | "error";

const RESPONSE_TIME_MAX_MS = 600_000;

// The player's own record, which drives the status line. Seeded once from the
// productions page-walk, then advanced locally from each 201 — the count and the
// mean are both derivable from what we already hold, so no refetch per word.
type MintRecord = {
  produced: number;
  scoreTotal: number;
};

function meanScore(record: MintRecord): number | null {
  return record.produced === 0
    ? null
    : Math.round(record.scoreTotal / record.produced);
}

// The reveal's audio source. The prompt carries no stimulus by design — the real
// word only speaks once the player has committed to theirs.
function targetStimulusSource(result: ProductionResponse): string | undefined {
  return result.target.stimulusUrl
    ? backendUrl(result.target.stimulusUrl)
    : undefined;
}

// Exported so the presentation guard and vitest can render it without a DOM.
export function MintStatusLine({
  index,
  totalProducible,
  mean,
}: {
  index: number;
  totalProducible?: number;
  mean: number | null;
}) {
  // apiRequest does no runtime validation, so an older backend without the
  // totalProducible rider would print "of NaN". Fall back to the bare index.
  const hasTotal = Number.isFinite(totalProducible);
  return (
    <span className="mint-status specimen">
      {MINT_STATUS_WORD_PREFIX}
      {index}
      {hasTotal ? `${MINT_STATUS_OF}${totalProducible}` : null}
      {mean === null ? null : `${MINT_STATUS_MEAN_PREFIX}${mean}`}
    </span>
  );
}

// The frozen 8.1 helper. The backend's validationErrors.input text is
// developer-facing and never reaches the player.
export function MintParseError({ hidden }: { hidden: boolean }) {
  return (
    <p
      className={hidden ? "mint-error slot-hidden" : "mint-error"}
      id="mint-error"
      aria-hidden={hidden || undefined}
    >
      {MINT_PARSE_ERROR_PREFIX}
      <em>{MINT_PARSE_ERROR_EXAMPLE_ONE}</em>
      {MINT_PARSE_ERROR_BETWEEN}
      <em>{MINT_PARSE_ERROR_EXAMPLE_TWO}</em>
      {MINT_PARSE_ERROR_SUFFIX}
    </p>
  );
}

export function MintPromptPanel({
  prompt,
  value,
  parseError,
  submitting,
  onChange,
  onSubmit,
  inputRef,
}: {
  prompt: ProductionPrompt;
  value: string;
  parseError: boolean;
  submitting: boolean;
  onChange: (next: string) => void;
  onSubmit: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const modality = prompt.modality ?? "";
  return (
    <section className="mint-prompt" aria-label="Invent a word">
      {/* The modality is prompt-side meaning, not a hint about the form to
          invent — so showing it pre-submit is sanctioned (V10). */}
      <span
        className={
          modality
            ? `mint-modality specimen mod-${modality.toLowerCase()}`
            : "mint-modality specimen"
        }
      >
        Meaning · {modality}
      </span>
      <p className="mint-instruction" id="mint-label">
        {MINT_INSTRUCTION}
      </p>
      <p className="mint-meaning">
        <strong>{prompt.gloss}</strong>
      </p>
      <div className="mint-input-row">
        <input
          className="mint-input"
          type="text"
          value={value}
          ref={inputRef}
          maxLength={24}
          aria-labelledby="mint-label"
          aria-describedby="mint-error"
          aria-invalid={parseError || undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          disabled={submitting}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <MintParseError hidden={!parseError} />
        <div className="one-shot">
          <span className="specimen pill">{MINT_ONE_SHOT_LABEL}</span>
          <small>{MINT_ONE_SHOT_SUPPORT}</small>
        </div>
        {/* Never disabled on malformed input: an attempted submit is how the
            player learns the rule, and a dead button teaches nothing. */}
        <button
          className="primary-button"
          type="button"
          disabled={submitting}
          onClick={onSubmit}
        >
          {MINT_SUBMIT_BUTTON}
        </button>
      </div>
    </section>
  );
}

export function MintRevealPanel({
  result,
  replayToken,
  onReplay,
  onNext,
  onBackToHome,
  onPlaybackError,
}: {
  result: ProductionResponse;
  replayToken: number;
  onReplay: () => void;
  onNext: () => void;
  onBackToHome: () => void;
  onPlaybackError?: (message: string) => void;
}) {
  const [replaySpin, setReplaySpin] = useState(0);
  const chips = chipsFor(result.features);

  return (
    <section className="mint-reveal" aria-label="The real word" aria-live="polite">
      <p className="reveal-line">
        {MINT_REVEAL_PREFIX}
        {/* Backend value, rendered verbatim. lang="ja" is a rendering
            attribute only — the form is never derived (invariant 1/3). */}
        <strong className="reveal-kana" lang="ja">
          {result.target.displayForm}
        </strong>
        {MINT_REVEAL_SUFFIX}
      </p>

      <div className="word-meta">
        <span>
          {result.target.romaji} · {result.target.gloss}
        </span>
        <button
          className="replay-pill"
          type="button"
          onClick={() => {
            onReplay();
            setReplaySpin((count) => count + 1);
          }}
        >
          <svg
            key={replaySpin}
            className={
              replaySpin > 0 ? "card-replay-icon is-spinning" : "card-replay-icon"
            }
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {RATING_REPLAY_BUTTON}
        </button>
        <StimulusPlayback
          autoplayToken={replayToken}
          playing
          src={targetStimulusSource(result)}
          onError={onPlaybackError}
        />
      </div>

      {/* Distance, not grade: the rule above stays neutral and the numeral
          carries the magnitude (V12). */}
      <div className="score-block">
        <span className="score-figure">{result.similarityScore}</span>
        <span className="specimen">{MINT_SCORE_LABEL}</span>
        <span className="score-caption">
          {result.similarityScore}
          {scoreBandTail(result.similarityScore)}
        </span>
      </div>

      <p className="yours-line">
        {MINT_YOURS_PREFIX}
        <code>{result.input}</code>
        {MINT_YOURS_SUFFIX}
      </p>

      {/* Present-in-either features only. Unmatched is muted, never negative:
          a feature you did not share is distance, not error. */}
      <ul className="mint-chips">
        {chips.map((match) => (
          <li
            key={match.feature}
            className={match.matched ? "mint-chip matched" : "mint-chip unmatched"}
          >
            {chipLabel(match)}
          </li>
        ))}
      </ul>

      {/* The table twin: the chips summarize, the table proves. All seven
          features, shared absences included. */}
      <details className="mint-table">
        <summary>View the full comparison</summary>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Yours</th>
              <th>Target</th>
              <th>Matched</th>
            </tr>
          </thead>
          <tbody>
            {result.features.map((match) => (
              <tr key={match.feature}>
                <td>{featureTableLabel(match)}</td>
                <td>{featureTableValue(match.feature, match.yours)}</td>
                <td>{featureTableValue(match.feature, match.target)}</td>
                <td>{match.matched ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div className="cta-row">
        <button className="primary-button" type="button" onClick={onNext}>
          {MINT_NEXT_BUTTON}
        </button>
        <button className="ghost-button" type="button" onClick={onBackToHome}>
          {MINT_BACK_BUTTON}
        </button>
      </div>
    </section>
  );
}

export function MintDonePanel({
  mean,
  produced,
  onBackToHome,
}: {
  mean: number | null;
  produced: number;
  onBackToHome: () => void;
}) {
  return (
    <section className="mint-done" aria-live="polite">
      <h1>Word Mint</h1>
      <p>You have minted a word for every meaning.</p>
      {mean === null ? null : (
        <p className="mint-done-mean">
          Your mean similarity across {produced}{" "}
          {produced === 1 ? "word" : "words"} is {mean}.
        </p>
      )}
      <div className="completion-actions">
        <button className="primary-button" type="button" onClick={onBackToHome}>
          {MINT_BACK_BUTTON}
        </button>
      </div>
    </section>
  );
}

export default function ProductionLab({
  onAuthExpired,
  onBackToHome,
}: ProductionLabProps) {
  const [phase, setPhase] = useState<MintPhase>("loading");
  const [prompt, setPrompt] = useState<ProductionPrompt | null>(null);
  const [result, setResult] = useState<ProductionResponse | null>(null);
  const [record, setRecord] = useState<MintRecord>({ produced: 0, scoreTotal: 0 });
  const [value, setValue] = useState("");
  const [parseError, setParseError] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loadToken, setLoadToken] = useState(0);
  const [replayToken, setReplayToken] = useState(0);

  // Response time is measured from the moment the meaning is on screen to the
  // moment the player commits. Anchored once per prompt, never on re-render.
  const promptShownAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyPrompt = useCallback((next: ProductionPrompt) => {
    if (next.completed) {
      setPhase("done");
      return;
    }
    setPrompt(next);
    setResult(null);
    setValue("");
    setParseError(false);
    // A playback error from the previous reveal must not follow the player onto
    // a fresh, unrelated meaning.
    setStatusMessage("");
    promptShownAtRef.current = performance.now();
    setPhase("prompt");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [next, mine] = await Promise.all([
          getNextProductionPrompt(),
          getAllMyProductions(),
        ]);
        if (!mounted) return;
        setRecord({
          produced: mine.length,
          scoreTotal: mine.reduce((total, entry) => total + entry.similarityScore, 0),
        });
        applyPrompt(next);
      } catch (caught) {
        if (!mounted) return;
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }
        setLoadError(
          caught instanceof Error ? caught.message : "Could not open Word Mint.",
        );
        setPhase("error");
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [applyPrompt, loadToken, onAuthExpired]);

  const loadNextPrompt = useCallback(async () => {
    setPhase("loading");
    setPrompt(null);
    setResult(null);
    try {
      applyPrompt(await getNextProductionPrompt());
    } catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        onAuthExpired(caught.message);
        return;
      }
      setLoadError(
        caught instanceof Error ? caught.message : "Could not load the next meaning.",
      );
      setPhase("error");
    }
  }, [applyPrompt, onAuthExpired]);

  const handleSubmit = useCallback(async () => {
    if (phase !== "prompt" || !prompt?.ideophoneId) return;

    // Mirror the server's shape check so an obvious typo costs no request. The
    // server is still authoritative: it also has to segment the form into morae.
    if (!isMintInputWellFormed(value)) {
      setParseError(true);
      inputRef.current?.focus();
      return;
    }

    setPhase("submitting");
    setParseError(false);
    setStatusMessage("");

    const elapsed = Math.round(performance.now() - promptShownAtRef.current);
    try {
      const response = await submitProduction({
        ideophoneId: prompt.ideophoneId,
        input: normalizeMintInput(value),
        responseTimeMs: Math.min(Math.max(elapsed, 0), RESPONSE_TIME_MAX_MS),
      });
      setResult(response);
      setRecord((current) => ({
        produced: current.produced + 1,
        scoreTotal: current.scoreTotal + response.similarityScore,
      }));
      setReplayToken((token) => token + 1);
      setPhase("revealed");
    } catch (caught) {
      const outcome = classifySubmitError(caught);
      if (outcome.kind === "auth-expired") {
        onAuthExpired(outcome.message);
        return;
      }
      if (outcome.kind === "advance") {
        void loadNextPrompt();
        return;
      }
      // Keep the value, keep the focus, stay on the word: the try survives.
      setParseError(outcome.parseError);
      setStatusMessage(outcome.message);
      setPhase("prompt");
      if (outcome.parseError) {
        inputRef.current?.focus();
      }
    }
  }, [loadNextPrompt, onAuthExpired, phase, prompt, value]);

  if (phase === "loading") {
    return <p className="status-text">Opening Word Mint...</p>;
  }

  if (phase === "error") {
    return (
      <section className="word-mint error-panel" aria-live="polite">
        <h1>Word Mint</h1>
        <p className="error-text centered">{loadError}</p>
        <div className="completion-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => setLoadToken((token) => token + 1)}
          >
            Try again
          </button>
          <button className="secondary-button" type="button" onClick={onBackToHome}>
            {MINT_BACK_BUTTON}
          </button>
        </div>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <div className="word-mint">
        <MintDonePanel
          mean={meanScore(record)}
          produced={record.produced}
          onBackToHome={onBackToHome}
        />
      </div>
    );
  }

  const revealed = phase === "revealed" && result !== null;

  return (
    <div className="word-mint">
      {/* On the prompt, {i} is the word you are about to mint; on the reveal it
          is the word you just minted, and the mean already counts it. */}
      <MintStatusLine
        index={revealed ? record.produced : record.produced + 1}
        totalProducible={prompt?.totalProducible}
        mean={meanScore(record)}
      />

      {revealed && result ? (
        <MintRevealPanel
          result={result}
          replayToken={replayToken}
          onReplay={() => setReplayToken((token) => token + 1)}
          onNext={() => void loadNextPrompt()}
          onBackToHome={onBackToHome}
          onPlaybackError={setStatusMessage}
        />
      ) : prompt ? (
        <MintPromptPanel
          prompt={prompt}
          value={value}
          parseError={parseError}
          submitting={phase === "submitting"}
          inputRef={inputRef}
          onChange={(next) => {
            setValue(next);
            setParseError(false);
          }}
          onSubmit={() => void handleSubmit()}
        />
      ) : null}

      <p className={statusMessage ? "status-line" : "status-line slot-hidden"}>
        {statusMessage}
      </p>
    </div>
  );
}
