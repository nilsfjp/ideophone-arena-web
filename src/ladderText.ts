import type { LadderFloorResponse, Modality } from "./api/types";

// Perception Ladder copy + floor model (NIL-42). This is DRAFT REGISTER, not
// frozen text: unlike experimentText.ts, every string here is Nils's to veto.
// Wording is lifted from the ladder-floors.html mockup and SPEC-view-designs
// §1 / verdicts V1–V9. The backend floors endpoint carries no name /
// description / thesis-mean, so those live here, keyed by modality.

// ---- Page-level chrome ----------------------------------------------------

export const LADDER_TITLE = "Perception Ladder";

export const LADDER_INTRO =
  "Climb from the outside world inward. The deeper you go, the more iconic the " +
  "words feel, and the worse everyone guesses. In the thesis, interoceptive " +
  "words were rated most word-like (4.45/7) and guessed worst.";

export const LADDER_FOOTNOTE =
  "Floor order follows the implicational hierarchy (Dingemanse 2012; McLean " +
  "2021): sound is guessed best, inner states worst. The ladder is that claim, " +
  "playable.";

// Floor-intro dialog (§1.7): a 2-sentence framing = this hierarchy line + the
// floor's own description, then the condition picker, then "Start floor {n}".
export const LADDER_DIALOG_HIERARCHY_LINE =
  "Each floor steps one rung inward, from the outside world toward the body's " +
  "inside, and the words get harder to guess as you climb.";

// Condition picker framing (invariant 9: "presentation changes the experience,"
// never "matched script helps you guess").
export const LADDER_CONDITION_HEADING = "Presentation";
export const LADDER_CONDITION_NOTE =
  "Pick how the words are presented. Presentation changes the experience, not your odds.";

// ---- In-run chrome + completion -------------------------------------------

export const LADDER_FINAL_RUNG_LABEL = "Final rung";
export const LADDER_BACK_CTA = "Back to the ladder";

export function floorRunLabel(ordinal: number, name: string): string {
  return `Floor ${ordinal} · ${name}`;
}

export function pairProgressLabel(current: number, total: number): string {
  return `Pair ${current} of ${total}`;
}

export function startFloorLabel(ordinal: number): string {
  return `Start floor ${ordinal}`;
}

export function nextFloorCtaLabel(ordinal: number, name: string): string {
  return `Start floor ${ordinal} · ${name}`;
}

export function floorCompleteHeading(correct: number, pairCount: number): string {
  return `Floor cleared: ${correct} of ${pairCount}`;
}

// Benchmark grammar (V7), returned as parts so the view can bold the numbers.
// Thesis-backed floors compare "you vs thesis floor mean"; Touch has no thesis
// baseline, so it reads as the norming-study line instead.
export type FloorBenchmark = {
  lead: string;
  thesis: string | null;
  you: string;
};

export function floorBenchmark(
  modality: Modality,
  correct: number,
  pairCount: number,
): FloorBenchmark {
  const { thesisMean } = getFloorPresentation(modality);
  if (thesisMean === null) {
    return {
      lead: "No thesis baseline; you're the norming study.",
      thesis: null,
      you: `${correct}/${pairCount}`,
    };
  }
  return {
    lead: "Floor mean in the thesis:",
    thesis: `${formatMean(thesisMean)}/10`,
    you: `${correct}/${pairCount}`,
  };
}

// ---- Summit ---------------------------------------------------------------

export const LADDER_SUMMIT_HEADING = "Summit reached";
export const LADDER_SUMMIT_INTRO =
  "You've climbed every floor. Here's how you did against the thesis cohort, rung by rung.";
export const LADDER_SUMMIT_OBSERVATORY_CTA = "See where this lands";

// ---- Per-modality floor model ---------------------------------------------

type FloorPresentation = {
  name: string;
  // Modality accent hook (CSS: tinted floor label + 3px inline-start rule).
  colorClass: string;
  description: string;
  // Thesis floor mean out of 10 (thesis-facts). Null for Touch, which has no
  // thesis baseline - the norming-study case.
  thesisMean: number | null;
};

const FLOOR_PRESENTATION: Record<string, FloorPresentation> = {
  AUDITORY: {
    name: "Sound",
    colorClass: "floor-aud",
    description: "Noises mapped to noises: the most transparent rung.",
    thesisMean: 6.86,
  },
  VISUAL: {
    name: "Sight",
    colorClass: "floor-vis",
    description: "Motion and light carried in vowels and stops.",
    thesisMean: 6.42,
  },
  HAPTIC: {
    // ⚠ NEW live-floor copy (NIL-42): the spec/mockup only ever drew a Touch
    // *teaser*. This description is derived faithfully from the §1.6 teaser
    // copy and awaits Nils's veto (draft register).
    name: "Touch",
    colorClass: "floor-hap",
    description:
      "Texture and contact: prickly vs fluffy, sticky vs dry-smooth. No lab " +
      "has baseline numbers for these, so you're the norming study.",
    thesisMean: null,
  },
  INTEROCEPTIVE: {
    name: "Inner states",
    colorClass: "floor-int",
    description: "Feelings from the body's inside: rated most iconic, guessed worst.",
    thesisMean: 5.97,
  },
};

export function getFloorPresentation(modality: Modality): FloorPresentation {
  return (
    FLOOR_PRESENTATION[String(modality).toUpperCase()] ?? {
      name: String(modality),
      colorClass: "floor-aud",
      description: "",
      thesisMean: null,
    }
  );
}

// Hierarchy rank fixes where the client-side Touch teaser splices in when the
// API omits a real HAPTIC floor (before Inner states).
const HIERARCHY_RANK: Record<string, number> = {
  AUDITORY: 0,
  VISUAL: 1,
  HAPTIC: 2,
  INTEROCEPTIVE: 3,
};

// V8 client-side Touch teaser. Rendered ONLY when the API returns no HAPTIC
// floor (graceful degradation); the live backend serves Touch as a real floor,
// so in production this is dormant - but the code path is proven by fixture.
const TOUCH_TEASER = {
  name: "Touch",
  colorClass: "floor-hap",
  description:
    "Six touch pairs are signed off: prickly vs fluffy, sticky vs dry-smooth. " +
    "They need studio recordings before they can be measured; when they arrive, " +
    "you're the norming study; no lab has baseline numbers for these.",
  statsText: "Predicted to land between Sight and Inner states",
  pillText: "In preparation",
};

// ---- Floor rows (pure, unit-tested) ---------------------------------------

export type FloorPillVariant = "cleared" | "current" | "muted";

export type FloorRow = {
  key: string;
  // null for the client-side teaser (no API modality yet).
  modality: Modality | null;
  // FLOOR n from API array position (V3). null for the teaser (no ordinal -
  // "the only floor card without one, which is honest").
  ordinal: number | null;
  name: string;
  colorClass: string;
  description: string;
  labelText: string;
  statsText: string;
  pillText: string;
  pillVariant: FloorPillVariant;
  interactive: boolean;
  ariaLabel: string;
  pairCount: number;
  finalRungPairCode: string | null;
  isTeaser: boolean;
  // The source floor for a playable card; null for the teaser.
  floor: LadderFloorResponse | null;
};

// Turn the API floor array into render rows: ordinals from array position,
// sequential-unlock pill states (V4), and - only when no HAPTIC floor is
// present - the Touch teaser spliced in at hierarchy position 3 (V8).
export function deriveFloorRows(floors: LadderFloorResponse[]): FloorRow[] {
  const firstUncleared = floors.findIndex((floor) => !floor.cleared);

  const realRows: FloorRow[] = floors.map((floor, index) => {
    const ordinal = index + 1;
    const presentation = getFloorPresentation(floor.modality);
    const state = deriveState(floor, index, ordinal, firstUncleared);

    return {
      key: String(floor.modality),
      modality: floor.modality,
      ordinal,
      name: presentation.name,
      colorClass: presentation.colorClass,
      description: presentation.description,
      labelText: `Floor ${ordinal} · ${presentation.name}`,
      statsText: floorStatsText(floor, presentation.thesisMean),
      pillText: state.pillText,
      pillVariant: state.pillVariant,
      interactive: state.interactive,
      ariaLabel: `Floor ${ordinal}, ${presentation.name}, ${state.stateWord}`,
      pairCount: floor.pairCount,
      finalRungPairCode: floor.finalRungPairCode,
      isTeaser: false,
      floor,
    };
  });

  const hasHaptic = floors.some(
    (floor) => String(floor.modality).toUpperCase() === "HAPTIC",
  );
  if (hasHaptic) {
    return realRows;
  }

  const teaserRow: FloorRow = {
    key: "touch-teaser",
    modality: null,
    ordinal: null,
    name: TOUCH_TEASER.name,
    colorClass: TOUCH_TEASER.colorClass,
    description: TOUCH_TEASER.description,
    labelText: TOUCH_TEASER.name,
    statsText: TOUCH_TEASER.statsText,
    pillText: TOUCH_TEASER.pillText,
    pillVariant: "muted",
    interactive: false,
    ariaLabel: `${TOUCH_TEASER.name}, in preparation`,
    pairCount: 0,
    finalRungPairCode: null,
    isTeaser: true,
    floor: null,
  };

  const insertAt = realRows.findIndex(
    (row) =>
      (HIERARCHY_RANK[String(row.modality).toUpperCase()] ??
        Number.MAX_SAFE_INTEGER) > HIERARCHY_RANK.HAPTIC,
  );
  const rows = [...realRows];
  if (insertAt === -1) {
    rows.push(teaserRow);
  } else {
    rows.splice(insertAt, 0, teaserRow);
  }
  return rows;
}

// True once every floor is cleared - drives the summit summary.
export function isSummit(floors: LadderFloorResponse[]): boolean {
  return floors.length > 0 && floors.every((floor) => floor.cleared);
}

function deriveState(
  floor: LadderFloorResponse,
  index: number,
  ordinal: number,
  firstUncleared: number,
): {
  pillText: string;
  pillVariant: FloorPillVariant;
  interactive: boolean;
  stateWord: string;
} {
  if (floor.cleared) {
    const score = formatScore(floor.bestCorrect, floor.bestAnswered);
    return {
      pillText: score ? `Cleared · ${score}` : "Cleared",
      pillVariant: "cleared",
      interactive: true,
      stateWord: "cleared · play again",
    };
  }

  if (index === firstUncleared) {
    return {
      pillText: "Up next",
      pillVariant: "current",
      interactive: true,
      stateWord: "up next",
    };
  }

  return {
    pillText: `After floor ${ordinal - 1}`,
    pillVariant: "muted",
    interactive: false,
    stateWord: `after floor ${ordinal - 1}`,
  };
}

function floorStatsText(
  floor: LadderFloorResponse,
  thesisMean: number | null,
): string {
  if (floor.cleared) {
    const score = formatScore(floor.bestCorrect, floor.bestAnswered);
    const base = score ? `Best · ${score}` : "Cleared";
    return thesisMean !== null
      ? `${base} · thesis mean ${formatMean(thesisMean)}`
      : base;
  }
  return `${floor.pairCount} ${floor.pairCount === 1 ? "pair" : "pairs"}`;
}

function formatScore(correct: number | null, answered: number | null): string {
  if (correct === null || answered === null) {
    return "";
  }
  return `${correct}/${answered}`;
}

export function formatMean(mean: number): string {
  return mean.toFixed(1);
}
