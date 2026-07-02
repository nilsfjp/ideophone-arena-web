import type { DivergenceEntry, RatingResponse } from "./api/types";
import type { RatingPoolWord } from "./ratingPool";

export type LabRecordRow = {
  ideophoneId: number;
  romaji: string;
  gloss: string;
  yourRating: number;
  meanRating: number | null;
  ratingCount: number;
  guessAccuracy: number | null;
  guessCount: number;
};

// Joins the player's ratings with the public divergence rows. Divergence
// carries the canonical romaji/gloss; the local pool fills gaps for words the
// research endpoint has no row for yet.
export function buildLabRecordRows(
  ratings: Map<number, RatingResponse>,
  divergenceMap: Map<number, DivergenceEntry> | null,
  pool: RatingPoolWord[],
): LabRecordRow[] {
  const poolById = new Map(pool.map((word) => [word.ideophoneId, word]));

  return [...ratings.values()].map((rating) => {
    const divergence = divergenceMap?.get(rating.ideophoneId);
    const poolWord = poolById.get(rating.ideophoneId);

    return {
      ideophoneId: rating.ideophoneId,
      romaji:
        divergence?.romaji || poolWord?.romaji || `word #${rating.ideophoneId}`,
      gloss: divergence?.gloss || poolWord?.meaning || "",
      yourRating: rating.rating,
      meanRating: divergence?.meanRating ?? null,
      ratingCount: divergence?.ratingCount ?? 0,
      guessAccuracy: divergence?.guessAccuracy ?? null,
      guessCount: divergence?.guessCount ?? 0,
    };
  });
}
