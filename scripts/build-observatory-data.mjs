// Observatory data pipeline (SPEC-stats-dashboard §4.3/§4.6): regenerates the
// committed JSON in src/data/observatory/ from the licensed research CSVs in
// data/observatory-sources/. The build graph never fetches anything - sources
// are vendored, outputs are committed, and this script is the only bridge.
//
// Contract:
//   - Deterministic: stable codepoint sorts, fixed key order, fixed rounding.
//     Running twice in a row must leave `git status` clean.
//   - Atomic: every output is built and validated in memory first; on any
//     problem the script prints ALL problems and exits 1 WITHOUT writing.
//   - Honest joins: arena↔norms matching is strict romaji string equality.
//     Transliteration/kana derivation is forbidden (experiment invariant 3
//     adjacent - display strings are received, never computed).
//
// Run: node scripts/build-observatory-data.mjs

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCES = join(process.cwd(), "data", "observatory-sources");
const OUT = join(process.cwd(), "src", "data", "observatory");
// The thesis rating trials (participant-level) live here, git-tracked. Only
// the per-modality counts they aggregate to are emitted - never the rows.
const RESEARCH_DATA = join(process.cwd(), "docs", "research", "data");

// The arena∩norms intersection is pinned. If the pool or the norms file
// changes, this number changes CONSCIOUSLY: rerun, read the printed match
// list, and update the constant in the same commit.
const EXPECTED_ARENA_MATCHES = 17;

// Thesis per-modality weighted accuracy, pinned to the published numbers
// (68.6 / 64.2 / 59.7 - SPEC-stats-dashboard §3.2). Tolerance ±0.001.
const EXPECTED_BY_MODALITY = {
  auditory: 0.686,
  visual: 0.642,
  interoceptive: 0.597,
};

const MODALITY_ORDER = ["auditory", "visual", "interoceptive"];

const problems = [];
const problem = (msg) => problems.push(msg);

// --- tiny RFC-4180-ish CSV parser (quoted fields, "" escapes, embedded
// commas and newlines, CRLF-tolerant). The norms CSV has quoted fields with
// embedded commas (Dominant_modalities), so naive split(",") is not an option.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function csvObjects(text) {
  const [header, ...rows] = parseCsv(text);
  return rows.map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])),
  );
}

const round = (x, dp) => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};

// Strict numeric cell parser: Number("") is 0, which would sail through the
// range validations and silently write corrupted data - a blank cell is a
// problem, not a zero (the atomicity contract depends on this).
const num = (value, context) => {
  if (String(value ?? "").trim() === "") {
    problem(`${context}: blank numeric cell`);
    return NaN;
  }
  return Number(value);
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Sample standard deviation (n−1) - matches the usual convention for
// published z-scores; the thesis layer standardizes its 30 pair means.
function sampleSd(xs) {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

// Codepoint comparison - never localeCompare (ICU/locale-dependent ordering
// would break the determinism contract across machines).
const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------
// Read sources
// ---------------------------------------------------------------------------

const [thesisCsv, mcleanCsv, normsCsv, poolRaw] = await Promise.all([
  readFile(join(SOURCES, "thesis-per-pair-stats.csv"), "utf8"),
  readFile(join(SOURCES, "GuessingRatingScores.csv"), "utf8"),
  readFile(join(SOURCES, "Perceptual_strength_norms_JpnRaw.csv"), "utf8"),
  readFile(join(SOURCES, "arena-pool.json"), "utf8"),
]);

// ---------------------------------------------------------------------------
// Arena pool (romaji + gloss, extracted once from the backend seed -
// provenance in the file's own meta). Validated and re-emitted so runtime
// imports only from src/data/observatory/.
// ---------------------------------------------------------------------------

const poolSource = JSON.parse(poolRaw);
const poolWords = [...poolSource.words].sort((a, b) =>
  byCodepoint(a.romaji, b.romaji),
);
if (poolWords.length !== 68) {
  problem(`arena-pool: expected 68 words, got ${poolWords.length}`);
}
if (new Set(poolWords.map((w) => w.romaji)).size !== poolWords.length) {
  problem("arena-pool: duplicate romaji");
}
for (const w of poolWords) {
  if (!w.romaji || !w.gloss) problem(`arena-pool: empty field in ${JSON.stringify(w)}`);
}
const poolByRomaji = new Map(poolWords.map((w) => [w.romaji, w]));

const arenaPoolOut = {
  meta: {
    ...poolSource.meta,
    generatedBy: "scripts/build-observatory-data.mjs",
    wordCount: poolWords.length,
  },
  words: poolWords,
};

// ---------------------------------------------------------------------------
// Thesis per-pair stats → thesis-pairs.json
// ---------------------------------------------------------------------------

const thesisRows = csvObjects(thesisCsv);
if (thesisRows.length !== 30) {
  problem(`thesis: expected 30 pairs, got ${thesisRows.length}`);
}

// The thesis CSV predates the sokuon file renames: three targets carry old
// spellings while the pool/API use the Kunrei-Q forms. Canonicalize to the
// authoritative pool romaji so the scatter layers label each word one way.
const THESIS_ROMAJI_CORRECTIONS = {
  sakutto: "sakuQ",
  kiritto: "kiriQ",
  hotto: "hoQ",
};

const thesisPairs = thesisRows.map((r) => {
  const nCorrect = num(r.n_correct_of36, `thesis ${r.pairing} n_correct`);
  const n = num(r.n, `thesis ${r.pairing} n`);
  const meanRating = num(r.mean_rating, `thesis ${r.pairing} mean_rating`);
  // target_word_file is e.g. "a9kh-sakutto" - romaji is everything after the
  // FIRST hyphen (defensive against romaji that itself contains a hyphen).
  const rawRomaji = r.target_word_file.split("-").slice(1).join("-");
  const romaji = THESIS_ROMAJI_CORRECTIONS[rawRomaji] ?? rawRomaji;
  if (!poolByRomaji.has(romaji)) {
    problem(
      `thesis: target "${romaji}" (from ${r.target_word_file}) is not in the arena pool - spelling drift?`,
    );
  }
  if (!MODALITY_ORDER.includes(r.modality)) {
    problem(`thesis: unknown modality "${r.modality}" in pairing ${r.pairing}`);
  }
  if (!(n > 0) || !(nCorrect >= 0) || nCorrect > n) {
    problem(`thesis: bad counts in pairing ${r.pairing} (${nCorrect}/${n})`);
  }
  if (!(meanRating >= 1 && meanRating <= 7)) {
    problem(`thesis: mean_rating out of 1–7 in pairing ${r.pairing}`);
  }
  return {
    pairing: r.pairing,
    modality: r.modality,
    romaji,
    // Recomputed from raw counts, not the pre-rounded accuracy_pct column.
    accuracy: round(nCorrect / n, 4),
    nCorrect,
    n,
    meanRating: round(meanRating, 2),
    medianRtMs: Math.round(num(r.median_rt_ms, `thesis ${r.pairing} median_rt`)),
  };
});

thesisPairs.sort(
  (a, b) =>
    MODALITY_ORDER.indexOf(a.modality) - MODALITY_ORDER.indexOf(b.modality) ||
    byCodepoint(a.pairing, b.pairing),
);

// Thesis rating z-layer (scatter y-axis, adjudicated 2026-07-05): each pair's
// mean rating standardized WITHIN the 30 thesis pairs. Mean/sd ride in meta so
// the session crosshair math is reproducible from the file alone.
const thesisRatings = thesisPairs.map((p) => p.meanRating);
const thesisRatingMean = mean(thesisRatings);
const thesisRatingSd = sampleSd(thesisRatings);
for (const p of thesisPairs) {
  p.meanRatingZ = round((p.meanRating - thesisRatingMean) / thesisRatingSd, 4);
}

const byModality = {};
for (const m of MODALITY_ORDER) {
  const pairs = thesisPairs.filter((p) => p.modality === m);
  const nSum = pairs.reduce((a, p) => a + p.n, 0);
  const correctSum = pairs.reduce((a, p) => a + p.nCorrect, 0);
  byModality[m] = {
    accuracy: round(correctSum / nSum, 4),
    n: nSum,
    meanRating: round(mean(pairs.map((p) => p.meanRating)), 2),
    pairs: pairs.length,
  };
  if (Math.abs(byModality[m].accuracy - EXPECTED_BY_MODALITY[m]) > 0.001) {
    problem(
      `thesis: byModality.${m}.accuracy ${byModality[m].accuracy} drifted from published ${EXPECTED_BY_MODALITY[m]}`,
    );
  }
}

const thesisOut = {
  meta: {
    source: "data/observatory-sources/thesis-per-pair-stats.csv",
    citation:
      "Paulsson, N. (2025), Unimodal and Cross-Modal Iconicity in Japanese Ideophones: A Cognitive-Semiotic Approach, MA thesis, Cognitive Semiotics, Lund University; per-pair 2AFC guessing and 1–7 rating stats, N = 36 participants, 30 pairs",
    license: "Author's own data",
    generatedBy: "scripts/build-observatory-data.mjs",
    pairCount: thesisPairs.length,
    ratingScale: "1-7",
    ratingMean: round(thesisRatingMean, 4),
    ratingSd: round(thesisRatingSd, 4),
  },
  byModality,
  pairs: thesisPairs,
};

// ---------------------------------------------------------------------------
// Thesis rating trials → thesis-ratings.json (per-modality 1–7 count grid, the
// raincloud reference layer - SPEC §3.4/§4.3). Aggregated from the
// participant-level gorilla export; ONLY the counts are emitted (no rows, no
// participant ids). The CSV is git-tracked at docs/research/data/; if it is
// ever absent the step is skipped and the committed JSON is left untouched, so
// determinism holds on a fresh clone. Deliberately mirrors the backend's
// rating-distributions shape so the panel normalizes live + thesis alike.
// ---------------------------------------------------------------------------

const gorillaRatingCsv = await readFile(
  join(RESEARCH_DATA, "gorilla-tidy-rating.csv"),
  "utf8",
).catch(() => null);

let thesisRatingsOut = null;
if (gorillaRatingCsv === null) {
  console.log(
    "build-observatory-data: gorilla-tidy-rating.csv absent - leaving committed thesis-ratings.json untouched",
  );
} else {
  const ratingTrials = csvObjects(gorillaRatingCsv);
  const distByModality = {};
  for (const m of MODALITY_ORDER) distByModality[m] = [0, 0, 0, 0, 0, 0, 0];
  let totalRatings = 0;
  for (const row of ratingTrials) {
    const modality = row["Spreadsheet: modality"];
    if (!MODALITY_ORDER.includes(modality)) {
      problem(`thesis-ratings: unexpected modality "${modality}"`);
      continue;
    }
    const rating = num(row.rating, "thesis-ratings.rating");
    if (!Number.isInteger(rating) || rating < 1 || rating > 7) {
      problem(`thesis-ratings: rating out of 1..7: "${row.rating}"`);
      continue;
    }
    distByModality[modality][rating - 1] += 1;
    totalRatings += 1;
  }
  if (totalRatings !== 1080) {
    problem(`thesis-ratings: expected 1080 ratings, got ${totalRatings}`);
  }
  const byModalityRatings = {};
  for (const m of MODALITY_ORDER) {
    const counts = distByModality[m];
    const n = counts.reduce((a, c) => a + c, 0);
    if (n !== 360) {
      problem(`thesis-ratings: ${m} expected 360 ratings, got ${n}`);
    }
    byModalityRatings[m] = { counts, n };
  }
  thesisRatingsOut = {
    meta: {
      source: "docs/research/data/gorilla-tidy-rating.csv",
      citation:
        "Paulsson, N. (2025), Unimodal and Cross-Modal Iconicity in Japanese Ideophones: A Cognitive-Semiotic Approach, MA thesis, Cognitive Semiotics, Lund University; 1–7 iconicity rating trials, N = 36 participants × 30 words",
      license:
        "Author's own data; pre-aggregated per-modality counts only; participant-level trials never vendored",
      generatedBy: "scripts/build-observatory-data.mjs",
      ratingScale: "1-7",
      totalRatings,
    },
    byModality: byModalityRatings,
  };
}

// ---------------------------------------------------------------------------
// McLean 2023 long → wide → mclean.json
// ---------------------------------------------------------------------------

const mcleanRows = csvObjects(mcleanCsv);
const mcleanById = new Map();
for (const r of mcleanRows) {
  const id = r.identifier;
  if (!mcleanById.has(id)) {
    // word/concept split at the FIRST underscore - concepts contain slashes
    // and parens (e.g. "aburaQkoi_OILY/HEAVY (FOOD)").
    const underscore = id.indexOf("_");
    mcleanById.set(id, {
      id,
      word: underscore === -1 ? id : id.slice(0, underscore),
      concept: underscore === -1 ? "" : id.slice(underscore + 1),
      stratum: r.ideophone === "y" ? "ideophone" : "prosaic",
    });
  }
  const item = mcleanById.get(id);
  const score = round(num(r.score, `mclean ${id} score`), 4);
  const z = round(num(r.z_score, `mclean ${id} z_score`), 4);
  if (!(score >= 0 && score <= 1)) {
    problem(`mclean: score out of [0,1] for ${id} / ${r.method}`);
  }
  if (r.method === "guesses") {
    item.guessScore = score;
    item.guessZ = z;
  } else if (r.method === "ratings") {
    item.ratingScore = score;
    item.ratingZ = z;
  } else {
    problem(`mclean: unknown method "${r.method}" for ${id}`);
  }
}

const mcleanItems = [...mcleanById.values()].sort((a, b) =>
  byCodepoint(a.id, b.id),
);
if (mcleanItems.length !== 304) {
  problem(`mclean: expected 304 items, got ${mcleanItems.length}`);
}
for (const item of mcleanItems) {
  if (item.guessScore === undefined || item.ratingScore === undefined) {
    problem(`mclean: ${item.id} is missing a method`);
  }
}
const ideophoneCount = mcleanItems.filter((i) => i.stratum === "ideophone").length;
if (ideophoneCount !== 101 || mcleanItems.length - ideophoneCount !== 203) {
  problem(
    `mclean: strata drifted (ideophones ${ideophoneCount}, prosaic ${mcleanItems.length - ideophoneCount}; expected 101/203)`,
  );
}

const mcleanOut = {
  meta: {
    source: "data/observatory-sources/GuessingRatingScores.csv",
    citation:
      "McLean, B., Dunn, M., & Dingemanse, M. (2023). Two measures are better than one. Language and Cognition.",
    license: "Source repo MIT; paper data CC BY 4.0, attribution required",
    generatedBy: "scripts/build-observatory-data.mjs",
    itemCount: mcleanItems.length,
    ideophoneCount,
    prosaicCount: mcleanItems.length - ideophoneCount,
    scales: {
      guessScore: "proportion correct, 2AFC guessing, 0–1",
      ratingScore: "iconicity rating, normalized 0–1 (their published coding)",
      z: "published z_score per method, standardized within the 304 items",
    },
  },
  items: mcleanItems,
};

// ---------------------------------------------------------------------------
// Iida & Akita norms → norms.json (+ arena join + default radar pair)
// ---------------------------------------------------------------------------

const AXIS_COLUMNS = [
  "Auditory",
  "Visual",
  "Haptic",
  "Gustatory",
  "Olfactory",
  "Interoceptive",
];

const normsRows = csvObjects(normsCsv);
if (normsRows.length !== 510) {
  problem(`norms: expected 510 words, got ${normsRows.length}`);
}

const normsWords = normsRows.map((r) => {
  const axes = AXIS_COLUMNS.map((c) => {
    const v = num(r[c], `norms ${r.Word} axis ${c}`);
    if (!Number.isFinite(v) || v < 0 || v > 5) {
      problem(`norms: ${r.Word} axis ${c} out of [0,5]: "${r[c]}"`);
    }
    return round(v, 3);
  });
  // Strict-equality join against the arena pool (Kunrei ≠ Hepburn misses are
  // expected and honest - 17 matches as of 2026-07-05).
  const arenaMatch = poolByRomaji.get(r.Word) ?? null;
  return {
    word: r.Word,
    axes,
    arena: arenaMatch ? { romaji: arenaMatch.romaji, gloss: arenaMatch.gloss } : null,
  };
});
normsWords.sort((a, b) => byCodepoint(a.word, b.word));
if (new Set(normsWords.map((w) => w.word)).size !== normsWords.length) {
  problem("norms: duplicate words");
}

const matched = normsWords.filter((w) => w.arena !== null);
if (matched.length !== EXPECTED_ARENA_MATCHES) {
  problem(
    `norms: arena∩norms is ${matched.length}, pinned ${EXPECTED_ARENA_MATCHES}. ` +
      `Matches: ${matched.map((w) => w.word).join(" ")}. If the pool or norms ` +
      `changed on purpose, update EXPECTED_ARENA_MATCHES in the same commit.`,
  );
}

// Default radar pair: the most contrasting profile pair in the intersection
// (max L1 distance over the 6 axes; ties broken by codepoint order of the
// sorted pair). SPEC-stats-dashboard §3.4 requires the default to come from
// the ACTUAL intersection, chosen at build time.
let defaultPair = null;
let defaultPairL1 = -1;
let runnerUp = null;
let runnerUpL1 = -1;
for (let i = 0; i < matched.length; i += 1) {
  for (let j = i + 1; j < matched.length; j += 1) {
    const a = matched[i];
    const b = matched[j];
    const l1 = round(
      a.axes.reduce((sum, v, k) => sum + Math.abs(v - b.axes[k]), 0),
      3,
    );
    const pair = [a.word, b.word].sort(byCodepoint);
    if (
      l1 > defaultPairL1 ||
      (l1 === defaultPairL1 && byCodepoint(pair.join(" "), defaultPair.join(" ")) < 0)
    ) {
      runnerUp = defaultPair;
      runnerUpL1 = defaultPairL1;
      defaultPair = pair;
      defaultPairL1 = l1;
    } else if (l1 > runnerUpL1) {
      runnerUp = pair;
      runnerUpL1 = l1;
    }
  }
}
if (!defaultPair) problem("norms: no default pair (empty intersection?)");

const normsOut = {
  meta: {
    source: "data/observatory-sources/Perceptual_strength_norms_JpnRaw.csv",
    citation:
      "Iida & Akita (2023). Perceptual strength norms for 510 Japanese words.",
    license: "Academic use with citation",
    generatedBy: "scripts/build-observatory-data.mjs",
    wordCount: normsWords.length,
    axisOrder: AXIS_COLUMNS.map((c) => c.toLowerCase()),
    axisMax: 5,
    arenaMatchCount: matched.length,
    defaultPair,
    defaultPairL1,
  },
  words: normsWords,
};

// ---------------------------------------------------------------------------
// Validate → write (atomic: nothing is written when any problem exists)
// ---------------------------------------------------------------------------

if (problems.length > 0) {
  console.error(`build-observatory-data: ${problems.length} problem(s), nothing written:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const outputs = [
  ["thesis-pairs.json", thesisOut],
  ["mclean.json", mcleanOut],
  ["norms.json", normsOut],
  ["arena-pool.json", arenaPoolOut],
];
// Only emitted when the (git-tracked) gorilla source is present; absence leaves
// the committed artifact untouched.
if (thesisRatingsOut) outputs.push(["thesis-ratings.json", thesisRatingsOut]);
for (const [name, data] of outputs) {
  await writeFile(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
}

console.log("build-observatory-data: wrote", outputs.map(([n]) => n).join(", "));
console.log(
  `  arena∩norms: ${matched.length} words - ${matched.map((w) => w.word).join(" ")}`,
);
console.log(
  `  default radar pair: ${defaultPair.join(" / ")} (L1 ${defaultPairL1}); runner-up ${runnerUp?.join(" / ")} (L1 ${runnerUpL1})`,
);
console.log(
  `  thesis byModality accuracy: ${MODALITY_ORDER.map((m) => `${m} ${byModality[m].accuracy}`).join(", ")}`,
);