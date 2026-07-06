// Single cast boundary for the vendored Observatory datasets. JSON imports
// widen literal types (tuples become number[], unions become string), so the
// dataset types are asserted here exactly once. Shape correctness is owned by
// the pipeline's validations (scripts/build-observatory-data.mjs refuses to
// write on any problem) plus data.test.ts over the committed files.

import arenaPoolJson from "./arena-pool.json";
import mcleanJson from "./mclean.json";
import normsJson from "./norms.json";
import thesisJson from "./thesis-pairs.json";
import type {
  ArenaPoolFile,
  McleanFile,
  NormsFile,
  ThesisPairsFile,
} from "./types";

export const thesisPairs = thesisJson as unknown as ThesisPairsFile;
export const mclean = mcleanJson as unknown as McleanFile;
export const norms = normsJson as unknown as NormsFile;
export const arenaPool = arenaPoolJson as unknown as ArenaPoolFile;

export type {
  ArenaPoolWord,
  McleanItem,
  McleanStratum,
  NormsAxes,
  NormsWord,
  ThesisModalityAggregate,
  ThesisPair,
  ThesisPairsFile,
  TrioModality,
} from "./types";
