import { getAllRatableWords } from "./api/client";
import type { RatableWordResponse } from "./api/types";

// The Rating Lab's word pool. Words enter it only through answered Choosing
// rounds: the round's word→meaning mapping is deliberately unknowable before
// feedback (2AFC anti-leak), and thesis task order (Choosing first) exists so
// revealed meanings never contaminate naive guessing. Since 27E the backend
// enforces that rule and serves the pool (GET /api/game/me/ratable-words),
// already minus rated words, in stable first-encounter order — so the pool
// follows the account across devices. The former username-scoped localStorage
// pool ("ideophone-arena-rating-pool") is retired without migration; only
// pre-deploy test data ever lived in it.
export type RatingPoolWord = RatableWordResponse;

export function fetchRatingPool(): Promise<RatingPoolWord[]> {
  return getAllRatableWords();
}
