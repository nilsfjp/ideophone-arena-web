import { type MouseEvent, useEffect, useRef, useState } from "react";
import type { ConditionPresentation } from "../conditionPresentation";
import { resolveStimulusSource } from "../stimulusMedia";
import type { IdeophoneOption } from "../api/types";
import StimulusDisplay from "./StimulusDisplay";
import StimulusPlayback from "./StimulusPlayback";

type IdeophoneCardProps = {
  meaning?: string;
  option: IdeophoneOption;
  presentation: ConditionPresentation;
  positionLabel: string;
  revealDetails?: boolean;
  mode?: "display" | "button";
  visible?: boolean;
  mediaVisible?: boolean;
  mediaPlaying?: boolean;
  autoplayToken?: number;
  disabled?: boolean;
  replayVisible?: boolean;
  replayDisabled?: boolean;
  onEnded?: () => void;
  onError?: (message: string) => void;
  onSelect?: (option: IdeophoneOption) => void;
  onReplay?: () => void;
};

// The reduced-motion pulse (§8) is a state change, not a CSS animation: the
// icon-spin lives behind prefers-reduced-motion: no-preference, but the border
// flash for reduced-motion users is an instant color held by this timer, so the
// token-purity motion gate stays green (no transition/animation in a reduce
// block).
const REPLAY_PULSE_MS = 180;

export default function IdeophoneCard({
  meaning,
  option,
  presentation,
  positionLabel,
  revealDetails = false,
  mode = "display",
  visible = true,
  mediaVisible = false,
  mediaPlaying = false,
  autoplayToken,
  disabled = false,
  replayVisible = false,
  replayDisabled = false,
  onEnded,
  onError,
  onSelect,
  onReplay,
}: IdeophoneCardProps) {
  // spinCount remounts the icon so the one-shot spin restarts per activation
  // (never on first appearance - guarded by > 0). pulsing drives the
  // reduced-motion border flash.
  const [spinCount, setSpinCount] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const pulseTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pulseTimer.current !== null) {
        window.clearTimeout(pulseTimer.current);
      }
    },
    [],
  );

  const cardClassName = [
    "ideophone-card",
    mode === "button" ? "choice-button" : "",
    visible ? "" : "empty",
    // The kana-measure guard (§8) rides this class for the card's whole visible
    // life - not just while the button shows - so a 6-mora word never reflows
    // when the control mounts at the choice phase (invariant 5).
    onReplay ? "has-replay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // The card and its display content stay mounted in every phase so the slot
  // keeps its reserved size; `empty` toggles visibility only. The media
  // element still mounts per-phase to preserve autoplay behavior - it renders
  // no visible box, so the reserved space is unaffected.
  const content = (
    <>
      <StimulusDisplay
        meaning={meaning}
        option={option}
        positionLabel={positionLabel}
        presentation={presentation}
        revealDetails={revealDetails}
      />

      {mediaVisible ? (
        <StimulusPlayback
          autoplayToken={autoplayToken}
          src={resolveStimulusSource(option)}
          playing={mediaPlaying}
          onEnded={onEnded}
          onError={onError}
        />
      ) : null}
    </>
  );

  const card =
    mode === "button" ? (
      // Position-only label until feedback: the choice must not reveal romaji,
      // kana, or meaning through the accessibility tree (invariant 7).
      <button
        aria-label={`Choose card ${positionLabel}`}
        className={cardClassName}
        disabled={disabled || !visible}
        type="button"
        onClick={() => onSelect?.(option)}
      >
        {content}
      </button>
    ) : (
      <div className={cardClassName}>{content}</div>
    );

  // Replay is a *sibling* of the choice button, never a child: nesting an
  // interactive control inside the card <button> is an a11y fault and a mis-tap
  // trap (§8). stopPropagation is belt-and-braces. Position-only aria-label,
  // byte-identical between A and B so nothing marks the target.
  const replayControl =
    onReplay && replayVisible ? (
      <button
        aria-label={`Replay card ${positionLabel}`}
        className={pulsing ? "card-replay-button is-active" : "card-replay-button"}
        disabled={replayDisabled}
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onReplay();
          setSpinCount((count) => count + 1);
          setPulsing(true);
          if (pulseTimer.current !== null) {
            window.clearTimeout(pulseTimer.current);
          }
          pulseTimer.current = window.setTimeout(
            () => setPulsing(false),
            REPLAY_PULSE_MS,
          );
        }}
      >
        <svg
          key={spinCount}
          className={
            spinCount > 0 ? "card-replay-icon is-spinning" : "card-replay-icon"
          }
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>
    ) : null;

  return (
    <div className="card-slot">
      {card}
      {replayControl}
    </div>
  );
}
