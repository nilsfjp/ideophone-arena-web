import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getLadderFloors,
  getNextRound,
  startSession,
} from "../api/client";
import type {
  AnswerResultResponse,
  ConditionName,
  GameSessionResponse,
  LadderFloorResponse,
  RoundResponse,
} from "../api/types";
import type { SessionStats } from "../App";
import { SCRIPT_LAB_CONDITION_OPTIONS } from "../conditionPresentation";
import {
  deriveFloorRows,
  floorBenchmark,
  floorCompleteHeading,
  floorRunLabel,
  getFloorPresentation,
  isSummit,
  LADDER_BACK_CTA,
  LADDER_CONDITION_HEADING,
  LADDER_CONDITION_NOTE,
  LADDER_DIALOG_HIERARCHY_LINE,
  LADDER_FINAL_RUNG_LABEL,
  LADDER_FOOTNOTE,
  LADDER_INTRO,
  LADDER_SUMMIT_HEADING,
  LADDER_SUMMIT_INTRO,
  LADDER_SUMMIT_OBSERVATORY_CTA,
  LADDER_TITLE,
  nextFloorCtaLabel,
  pairProgressLabel,
  startFloorLabel,
  type FloorPillVariant,
  type FloorRow,
} from "../ladderText";
import {
  isCompletionError,
  isCompletionPayload,
  isPlayableRound,
} from "../roundValidation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import TrialPlayer from "./TrialPlayer";

const DEFAULT_LADDER_CONDITION: ConditionName = "CONDITION_1_SOKUON";

const EMPTY_STATS: SessionStats = { answered: 0, correct: 0 };

type PerceptionLadderProps = {
  onAuthExpired: (message: string) => void;
  onExit: () => void;
  // Open the public Observatory (summit "See where this lands" CTA).
  onVisitObservatory: () => void;
};

type LadderStatus = "loading" | "ready" | "error";

export default function PerceptionLadder({
  onAuthExpired,
  onExit,
  onVisitObservatory,
}: PerceptionLadderProps) {
  const [floors, setFloors] = useState<LadderFloorResponse[] | null>(null);
  const [status, setStatus] = useState<LadderStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // The floor being introduced (dialog) or played. Always a real, playable
  // floor — the client-side teaser is never selectable.
  const [activeFloor, setActiveFloor] = useState<FloorRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<ConditionName>(
    DEFAULT_LADDER_CONDITION,
  );

  const [session, setSession] = useState<GameSessionResponse | null>(null);
  const [round, setRound] = useState<RoundResponse | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_STATS);
  const [isStarting, setIsStarting] = useState(false);
  const [floorComplete, setFloorComplete] = useState(false);
  const [runError, setRunError] = useState("");

  // Show the full-page spinner only on the first load; a post-completion
  // refresh keeps the stack visible. The ref is written inside the effect,
  // never during render.
  const loadedOnceRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!loadedOnceRef.current) {
        setStatus("loading");
      }
      setLoadError("");
      try {
        const response = await getLadderFloors();
        if (!mounted) {
          return;
        }
        setFloors(response.floors);
        setStatus("ready");
        loadedOnceRef.current = true;
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }
        if (!mounted) {
          return;
        }
        setLoadError(
          caught instanceof Error ? caught.message : "The ladder failed to load.",
        );
        setStatus("error");
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [reloadToken, onAuthExpired]);

  const loadNextRound = useCallback(
    async (sessionUuid: string) => {
      setRunError("");
      try {
        const nextRound = await getNextRound(sessionUuid);
        if (isCompletionPayload(nextRound)) {
          setRound(null);
          setSession(null);
          setFloorComplete(true);
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
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }
        if (isCompletionError(caught)) {
          setRound(null);
          setSession(null);
          setFloorComplete(true);
          return;
        }
        setRound(null);
        setSession(null);
        setRunError(
          caught instanceof Error ? caught.message : "Round failed to load",
        );
      }
    },
    [onAuthExpired],
  );

  const startFloor = useCallback(
    async (row: FloorRow) => {
      if (!row.modality) {
        return;
      }
      setDialogOpen(false);
      setActiveFloor(row);
      setFloorComplete(false);
      setRunError("");
      setRound(null);
      setSession(null);
      setSessionStats(EMPTY_STATS);
      setIsStarting(true);
      try {
        // LADDER sessions take an explicit floor (never a difficultyLevel) and
        // reject includePractice, so it is omitted here.
        const created = await startSession({
          conditionName: selectedCondition,
          gameMode: "LADDER",
          floor: row.modality,
        });
        setSession(created);
        await loadNextRound(created.sessionUuid);
      } catch (caught) {
        if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
          onAuthExpired(caught.message);
          return;
        }
        setRunError(
          caught instanceof Error ? caught.message : "The floor failed to start.",
        );
      } finally {
        setIsStarting(false);
      }
    },
    [loadNextRound, onAuthExpired, selectedCondition],
  );

  const handleSelectFloor = useCallback((row: FloorRow) => {
    setActiveFloor(row);
    setDialogOpen(true);
  }, []);

  const handleAnswered = useCallback((result: AnswerResultResponse) => {
    if (result.practice) {
      return;
    }
    setSessionStats((current) => ({
      answered: current.answered + 1,
      correct: current.correct + (result.correct ? 1 : 0),
    }));
  }, []);

  const handleBackToLadder = useCallback(() => {
    setSession(null);
    setRound(null);
    setFloorComplete(false);
    setActiveFloor(null);
    setSessionStats(EMPTY_STATS);
    setRunError("");
    // Refresh floors so the just-cleared floor and its best score appear.
    setReloadToken((token) => token + 1);
  }, []);

  // ---- Loading / error --------------------------------------------------

  if (status === "loading" && floors === null) {
    return <p className="status-text">Opening the Perception Ladder...</p>;
  }

  if (status === "error" || floors === null) {
    return (
      <section className="ladder error-panel" aria-live="polite">
        <h1>{LADDER_TITLE}</h1>
        <p className="error-text centered">
          {loadError || "The ladder failed to load."}
        </p>
        <div className="completion-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Try again
          </button>
          <button className="secondary-button" type="button" onClick={onExit}>
            Back to modes
          </button>
        </div>
      </section>
    );
  }

  // ---- In-run (chrome strip above an untouched trial board) -------------

  if (session && round && activeFloor) {
    const pairCount = activeFloor.pairCount;
    const currentPair = Math.min(pairCount, sessionStats.answered + 1);
    const isFinalRung = pairCount > 0 && currentPair >= pairCount;
    const ordinal = activeFloor.ordinal ?? 0;

    return (
      <section className="ladder ladder-run">
        <div className="run-strip">
          <span className={`specimen floor-label ${activeFloor.colorClass}`}>
            {floorRunLabel(ordinal, activeFloor.name)}
          </span>
          <span className="specimen ladder-pair">
            {pairProgressLabel(currentPair, pairCount)}
          </span>
          {/* Final-rung marker keeps its slot reserved so the strip never
              reflows when it appears on the last pair. */}
          <span
            className={
              isFinalRung
                ? `specimen ladder-final-rung ${activeFloor.colorClass}`
                : `specimen ladder-final-rung ${activeFloor.colorClass} slot-hidden`
            }
          >
            {LADDER_FINAL_RUNG_LABEL}
          </span>
        </div>

        <TrialPlayer
          key={`${session.sessionUuid}:${round.roundId}`}
          round={round}
          sessionStats={sessionStats}
          sessionUuid={session.sessionUuid}
          totalRounds={pairCount}
          onAnswered={handleAnswered}
          onAuthExpired={onAuthExpired}
          onNeedNextRound={() => void loadNextRound(session.sessionUuid)}
          onBackToStart={handleBackToLadder}
        />
      </section>
    );
  }

  // ---- Floor completion (benchmark grammar, V7) -------------------------

  if (floorComplete && activeFloor) {
    const pairCount = activeFloor.pairCount;
    const correct = sessionStats.correct;
    const benchmark = floorBenchmark(activeFloor.modality ?? "", correct, pairCount);
    const rows = deriveFloorRows(floors);
    const nextRow =
      rows.find(
        (row) => !row.isTeaser && row.ordinal === (activeFloor.ordinal ?? 0) + 1,
      ) ?? null;

    return (
      <section
        className="ladder ladder-complete"
        aria-label={`${activeFloor.name} floor complete`}
      >
        <div className={`floor-complete ${activeFloor.colorClass}`}>
          <span className={`specimen floor-label ${activeFloor.colorClass}`}>
            {floorRunLabel(activeFloor.ordinal ?? 0, activeFloor.name)} · complete
          </span>
          <h2>{floorCompleteHeading(correct, pairCount)}</h2>
          <p className="benchmark">
            {benchmark.lead}
            {benchmark.thesis ? (
              <>
                {" "}
                <strong>{benchmark.thesis}</strong>.
              </>
            ) : null}{" "}
            You: <strong>{benchmark.you}</strong>.
          </p>
          {runError ? <p className="error-text centered">{runError}</p> : null}
          <div className="cta-row">
            {nextRow ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => void startFloor(nextRow)}
              >
                {nextFloorCtaLabel(nextRow.ordinal ?? 0, nextRow.name)}
              </button>
            ) : null}
            <button
              className="ghost-button"
              type="button"
              onClick={handleBackToLadder}
            >
              {LADDER_BACK_CTA}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---- Starting / loading gap ------------------------------------------

  if (isStarting || (session && !round)) {
    return <p className="status-text">Starting the floor...</p>;
  }

  // ---- Floor stack (State A) + floor-intro dialog ----------------------

  const rows = deriveFloorRows(floors);
  const summit = isSummit(floors);

  return (
    <section className="ladder" aria-labelledby="ladder-title">
      <button className="secondary-button ladder-back" type="button" onClick={onExit}>
        Back to modes
      </button>

      <h1 id="ladder-title">{LADDER_TITLE}</h1>
      <LadderWaveRule />

      {summit ? (
        <SummitPanel floors={floors} onVisitObservatory={onVisitObservatory} />
      ) : (
        <p className="ladder-intro">{LADDER_INTRO}</p>
      )}

      <LadderFloorStack rows={rows} onSelectFloor={handleSelectFloor} />

      <p className="ladder-foot">{LADDER_FOOTNOTE}</p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {activeFloor ? (
          <DialogContent className="ladder-intro-dialog">
            <DialogHeader>
              <span className={`specimen floor-label ${activeFloor.colorClass}`}>
                {floorRunLabel(activeFloor.ordinal ?? 0, activeFloor.name)}
              </span>
              <DialogTitle>{activeFloor.name}</DialogTitle>
              <DialogDescription>
                {LADDER_DIALOG_HIERARCHY_LINE} {activeFloor.description}
              </DialogDescription>
            </DialogHeader>

            <div className="ladder-condition">
              <h3 className="ladder-condition-heading">
                {LADDER_CONDITION_HEADING}
              </h3>
              <p className="ladder-condition-note">{LADDER_CONDITION_NOTE}</p>
              <div
                className="condition-option-list"
                role="group"
                aria-label={LADDER_CONDITION_HEADING}
              >
                {SCRIPT_LAB_CONDITION_OPTIONS.map((option) => {
                  const isSelected =
                    option.conditionName === selectedCondition;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`condition-option${isSelected ? " active" : ""}`}
                      key={option.conditionName}
                      type="button"
                      onClick={() => setSelectedCondition(option.conditionName)}
                    >
                      <span className="condition-option-title">
                        {option.label}
                      </span>
                      <span className="condition-option-copy">
                        {option.explanation}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <button
                className="primary-button"
                type="button"
                onClick={() => void startFloor(activeFloor)}
              >
                {startFloorLabel(activeFloor.ordinal ?? 0)}
              </button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

// Floor stack — a <ul> of cards; playable floors are buttons, locked floors and
// the teaser are non-interactive <article>s. Exported for the fixture test.
export function LadderFloorStack({
  rows,
  onSelectFloor,
}: {
  rows: FloorRow[];
  onSelectFloor: (row: FloorRow) => void;
}) {
  return (
    <ul className="ladder-stack">
      {rows.map((row) =>
        row.interactive ? (
          <li key={row.key}>
            <button
              className={`ladder-floor ${row.colorClass}`}
              type="button"
              aria-label={row.ariaLabel}
              onClick={() => onSelectFloor(row)}
            >
              <FloorCardBody row={row} />
            </button>
          </li>
        ) : (
          <li key={row.key}>
            <article
              className={`ladder-floor ${row.colorClass}`}
              aria-disabled="true"
              aria-label={row.ariaLabel}
            >
              <FloorCardBody row={row} />
            </article>
          </li>
        ),
      )}
    </ul>
  );
}

function FloorCardBody({ row }: { row: FloorRow }) {
  return (
    <>
      <span className="specimen floor-label">{row.labelText}</span>
      <p className="floor-name">{row.name}</p>
      <p className="floor-desc">{row.description}</p>
      <div className="floor-meta">
        <span className="specimen">{row.statsText}</span>
        <span className={`specimen pill ${pillClass(row.pillVariant)}`}>
          {row.pillText}
        </span>
      </div>
    </>
  );
}

function pillClass(variant: FloorPillVariant): string {
  if (variant === "cleared") {
    return "pill-cleared";
  }
  if (variant === "current") {
    return "pill-current";
  }
  return "pill-muted";
}

// Summit summary (all floors cleared): per-floor benchmark pairs, no chart
// (V7), with the sanctioned Observatory deep-link. Replaces the intro line.
function SummitPanel({
  floors,
  onVisitObservatory,
}: {
  floors: LadderFloorResponse[];
  onVisitObservatory: () => void;
}) {
  return (
    <section className="ladder-summit" aria-label="Summit">
      <h2>{LADDER_SUMMIT_HEADING}</h2>
      <p className="ladder-summit-intro">{LADDER_SUMMIT_INTRO}</p>
      <ul className="ladder-summit-list">
        {floors.map((floor, index) => {
          const presentation = getFloorPresentation(floor.modality);
          const correct = floor.bestCorrect ?? 0;
          const benchmark = floorBenchmark(floor.modality, correct, floor.pairCount);
          return (
            <li key={String(floor.modality)}>
              <span className="specimen">
                Floor {index + 1} · {presentation.name}
              </span>
              <span className="ladder-summit-score">
                {benchmark.lead}
                {benchmark.thesis ? ` ${benchmark.thesis}.` : ""} You:{" "}
                {benchmark.you}.
              </span>
            </li>
          );
        })}
      </ul>
      <div className="cta-row">
        <button
          className="ghost-button"
          type="button"
          onClick={onVisitObservatory}
        >
          {LADDER_SUMMIT_OBSERVATORY_CTA}
        </button>
      </div>
    </section>
  );
}

function LadderWaveRule() {
  return (
    <svg
      className="wave-rule"
      width={180}
      height={14}
      viewBox="0 0 180 14"
      aria-hidden="true"
    >
      <path d="M2 7 L14 7 L20 2 L30 12 L40 3 L50 11 L58 7 L94 7 L100 4 L108 10 L114 7 L178 7" />
    </svg>
  );
}
