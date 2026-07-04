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

// A word's display metadata (romaji + gloss). Persisted so the lab record can
// still label a word rated in an EARLIER visit even when the public divergence
// fetch fails on the current visit: once a word is rated it leaves the ratable
// pool, so neither the divergence map (failed) nor the pool (excludes it) can
// supply its romaji/gloss — and RatingResponse carries neither. The cache is
// written while the word is still rateable (from the pool word, which has both),
// so the data survives into later visits. (NIL-65 rider.)
export type WordMeta = { romaji?: string; gloss?: string };

const WORD_META_KEY = "ideophone-arena-word-meta";

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

// Merge known romaji/gloss into the persisted cache. Safe to call with partial
// data; empty fields never overwrite a remembered value.
export function rememberWordMeta(
  entries: Array<{ ideophoneId: number; romaji?: string; gloss?: string }>,
): void {
  if (!storageAvailable()) return;
  try {
    const store: Record<string, WordMeta> = JSON.parse(
      localStorage.getItem(WORD_META_KEY) ?? "{}",
    );
    let changed = false;
    for (const entry of entries) {
      const romaji = entry.romaji?.trim();
      const gloss = entry.gloss?.trim();
      if (!romaji && !gloss) continue;
      const key = String(entry.ideophoneId);
      const prev = store[key] ?? {};
      const next: WordMeta = {
        romaji: romaji || prev.romaji,
        gloss: gloss || prev.gloss,
      };
      if (next.romaji !== prev.romaji || next.gloss !== prev.gloss) {
        store[key] = next;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(WORD_META_KEY, JSON.stringify(store));
    }
  } catch {
    // Quota/parse failures are non-fatal — the cache is a best-effort fallback.
  }
}

export function readWordMeta(): Map<number, WordMeta> {
  if (!storageAvailable()) return new Map();
  try {
    const store: Record<string, WordMeta> = JSON.parse(
      localStorage.getItem(WORD_META_KEY) ?? "{}",
    );
    return new Map(Object.entries(store).map(([id, meta]) => [Number(id), meta]));
  } catch {
    return new Map();
  }
}

// Joins the player's ratings with the public divergence rows. Divergence
// carries the canonical romaji/gloss; the local pool fills gaps for words the
// research endpoint has no row for yet; the persisted cache is the last
// fallback (words rated in an earlier visit when divergence is unavailable).
export function buildLabRecordRows(
  ratings: Map<number, RatingResponse>,
  divergenceMap: Map<number, DivergenceEntry> | null,
  pool: RatingPoolWord[],
  fallbackMeta: Map<number, WordMeta> = new Map(),
): LabRecordRow[] {
  const poolById = new Map(pool.map((word) => [word.ideophoneId, word]));

  return [...ratings.values()].map((rating) => {
    const divergence = divergenceMap?.get(rating.ideophoneId);
    const poolWord = poolById.get(rating.ideophoneId);
    const cached = fallbackMeta.get(rating.ideophoneId);

    return {
      ideophoneId: rating.ideophoneId,
      romaji:
        divergence?.romaji ||
        poolWord?.romaji ||
        cached?.romaji ||
        `word #${rating.ideophoneId}`,
      gloss: divergence?.gloss || poolWord?.meaning || cached?.gloss || "",
      yourRating: rating.rating,
      meanRating: divergence?.meanRating ?? null,
      ratingCount: divergence?.ratingCount ?? 0,
      guessAccuracy: divergence?.guessAccuracy ?? null,
      guessCount: divergence?.guessCount ?? 0,
    };
  });
}
