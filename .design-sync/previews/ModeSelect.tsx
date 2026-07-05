// Authored preview — the real ModeSelect (the six-mode home shell, §2.3) from
// window.IdeophoneArena. Cards render from `modes` data only, so the auto-fill
// grid scales without code changes. Each card carries a measure chip (specimen
// label), title, one-line description, and a reserved status slot. Data mirrors
// src/modes.ts (two available modes + one coming-soon).
import { ModeSelect } from "ideophone-arena-web";

const modes = [
  {
    id: "choosing",
    title: "Meaning Match",
    measure: "Measure · Guessing",
    status: "available",
    description:
      "Hear two Japanese words, then choose the card that best fits the target meaning.",
  },
  {
    id: "rating",
    title: "Rating Lab",
    measure: "Measure · Reflection",
    status: "available",
    description:
      "Listen again to words you have met and rate how much each one resembles its meaning.",
  },
  {
    id: "ladder",
    title: "Perception Ladder",
    measure: "Journey · Perception",
    status: "coming-soon",
    description:
      "Climb from sounds to sights to inner states to touch, one floor at a time.",
  },
];

export const SixModeShell = () => (
  <div style={{ padding: "var(--space-4)" }}>
    {/* onSelect is a no-op in the static card; the real shell routes by id. */}
    <ModeSelect modes={modes} onSelect={() => {}} />
  </div>
);
