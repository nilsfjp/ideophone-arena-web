// Registry of game modes shown on the home screen. Data only — App.tsx maps
// mode ids to views, so future modes (27D Rating Lab, 28B Modality Ladder)
// flip `status` here and add a view branch without touching ModeSelect.
export type ModeId = "choosing" | "rating" | "ladder";
export type ModeStatus = "available" | "coming-soon";

export type ModeDefinition = {
  id: ModeId;
  title: string;
  description: string;
  status: ModeStatus;
};

export const MODES: ModeDefinition[] = [
  {
    id: "choosing",
    title: "Choosing Task",
    status: "available",
    description:
      "Hear two Japanese words, then choose the card that best fits the target meaning.",
  },
  {
    id: "rating",
    title: "Rating Lab",
    status: "available",
    description:
      "Listen again to words you have met and rate how much each one resembles its meaning.",
  },
  {
    id: "ladder",
    title: "Modality Ladder",
    status: "coming-soon",
    description:
      "Work through words for sounds, sights, and inner feelings, one rung at a time.",
  },
];
