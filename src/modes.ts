// Registry of game modes shown on the home screen. Data only — App.tsx maps
// mode ids to views, so future modes (Perception Ladder, Word Mint, ...) flip
// `status` here and add a view branch without touching ModeSelect. Player-
// facing names are the adopted slate (NIL-64 §10.2); internal ids and API
// values are unchanged. New modes are NOT added here until their own build
// ships — the six-mode shell (§2.3) scales from this data, not from stubs.
export type ModeId = "choosing" | "rating" | "ladder";
export type ModeStatus = "available" | "coming-soon";

export type ModeDefinition = {
  id: ModeId;
  title: string;
  description: string;
  status: ModeStatus;
  // Specimen-label "measure chip" (§2.3/§3.4): the taxonomy of measures,
  // hiding in plain sight (§10.3). Rendered uppercase by the label style.
  measure: string;
};

export const MODES: ModeDefinition[] = [
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
    status: "available",
    description:
      "Climb from sounds to sights to inner states to touch, one floor at a time.",
  },
];
