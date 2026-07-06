# Observatory source data

Inputs for `scripts/build-observatory-data.mjs`, which generates the committed
JSON in `src/data/observatory/`. These files are vendored so the build graph
never reaches outside the repo (SPEC-stats-dashboard §4.3/§4.6). Do not edit
them by hand; replacing one is a conscious data update — rerun the pipeline and
review its printed summary (intersection count, default radar pair) in the same
commit.

| File | Source | License | Citation |
|---|---|---|---|
| `thesis-per-pair-stats.csv` | Author's MA thesis analysis (30 pairs × 36 participants: 2AFC accuracy, 1–7 iconicity ratings, response times) | Author's own data | Paulsson (2026), MA thesis |
| `GuessingRatingScores.csv` | McLean 2023 ideophone-dataset repo, `mclean2023-measures/` (304 items × guessing + rating scores with published z-scores) | Source repo MIT; paper data CC BY 4.0 — attribution required | McLean, B., Dunn, M., & Dingemanse, M. (2023). *Two measures are better than one.* Language and Cognition |
| `Perceptual_strength_norms_JpnRaw.csv` | Iida & Akita perceptual strength norms (510 Japanese words × 6 modality axes, 0–5, plus iconicity) | Academic use with citation | Iida & Akita (2023), perceptual strength norms for 510 Japanese words |
| `arena-pool.json` | Extracted once from the backend seed (`ideophone-arena-api` `db/init/ideophone_arena.sql`, ideophones INSERT), 2026-07-05 | Project's own data | — |

Notes:

- The arena's API romaji is Kunrei-shiki with Q/N (`sitosito`, `zyaazyaa`,
  `syoboN`, `sakuQ`); the norms lean Hepburn. Joins are **strict string
  equality only** — transliteration/derivation is forbidden (the same rule
  that keeps script display received-never-computed). The honest intersection
  is 17 words as of 2026-07-05, pinned in the pipeline.
- Deployment is non-commercial; attribution is mandatory and rendered in the
  Observatory's footer.
- Participant-level thesis data (`gorilla-tidy-*.csv`) stays out of this repo
  by policy; only pre-aggregated statistics are vendored.
