# Frontend progress log

Repository: `/code/js/ideophone-arena-web`. Append one entry per working session,
newest at the bottom, mirroring the backend's `docs/progress-log.md` format
(`## <date> (<session label>)` then Session goal / Changed / Proof / Result /
Commit / Blocker / Next single task). The backend repo is the authority for the
shared contract; this log is the frontend's own session continuity.

Entries S1–S4 below are backfilled terse from the `CLAUDE.md`/`AGENTS.md` punch
list to give the log continuity from before it existed; their proof lines
reference evidence already recorded in `docs/frontend-grading-checklist.md`.

## 2026-06-10 (S1)

Session goal:
Stop computing script on the client; render the backend's authoritative
pre-answer script verbatim and consume per-word audio.

Changed:
Deleted the kana-conversion/detection heuristics in `conditionPresentation.ts`
(they inverted the script manipulation). `StimulusDisplay` now renders the
backend `displayForm` (pre-flipped for mismatch) verbatim and reveals
`canonicalForm` + romaji + meaning at feedback. `roundValidation.ts` surfaces the
round-problem error state when `displayForm`/`canonicalForm` is missing or blank
instead of guessing. Stimulus playback consumes per-word audio
(`/stimuli/audio/<file>.m4a`) through the existing blob/`ended`-event path.

Proof:
`npm run test` (new vitest) covers condition mapping, per-condition
`displayForm`/placeholder rendering, `canonicalForm` reveal, and the
missing-field round-problem path. `node scripts/verify-presentation-logic.mjs`
scans `src/` for forbidden kana identifiers and asserts pre-answer markup equals
the backend `displayForm` verbatim (incl. the `じゃあじゃあ`→`ジャージャー`
long-vowel case). `node scripts/verify-browser-loop.mjs` passed a full 30-round
Audio-only session against backend 8081.

Result:
Shipped. Script display is received, never computed (experiment invariant 3);
audio-only shows neutral A/B placeholders pre-answer (invariant 4).

Commit:
Shipped 2026-06-10 (see git history).

Blocker:
None.

Next single task:
Reserved-space rendering in `TrialPlayer` to kill mid-trial layout shift, and
extract the frozen trial strings to a single module.

## 2026-06-11 (S2)

Session goal:
Eliminate mid-trial layout shift and freeze participant-facing trial wording in
one place.

Changed:
`TrialPlayer` renders all phase elements into reserved space at mount; phases
toggle visibility, not document flow (mobile bug fix and timing-validity
requirement, invariant 5). Extracted the frozen participant-facing trial strings
to `src/experimentText.ts` (invariant 1) - the only home for that text. Trial
aria-labels are position-only ("Choose card A") until feedback (invariant 7).
Removed dev-speak copy from the UI.

Proof:
`node scripts/verify-presentation-logic.mjs` asserts the frozen
`experimentText.ts` strings and the reserved-layout slots. `npm run build` /
`npm run lint` green. Browser proof confirmed no mid-trial reflow at a 360–390px
viewport.

Result:
Shipped 2026-06-10/11.

Commit:
Shipped (see git history).

Blocker:
None.

Next single task:
Switch the leaderboard to best-completed-session fields and add practice-round
support.

## 2026-06-12 (S3)

Session goal:
Adopt the backend's best-completed-session leaderboard metric and add
optional, non-scored practice rounds.

Changed:
Leaderboard reads the paginated wrapper's `entries` and the best-session fields
(`bestSessionCorrect`/`bestSessionAnswered`/`bestSessionAccuracy`), rendered as
"Best session" and "Accuracy" columns with a Previous/Next pager shown only when
`totalPages > 1`. Added an "Include 2 practice rounds (not scored)" toggle
(default ON; `includePractice` always sent explicitly). During practice the
header shows "Practice round" with a "Not scored" badge, the round counter and
score readout are suppressed, the progress bar holds at 0%, and practice answers
never touch session stats.

Proof:
Vitest fixtures in `Leaderboard.test.tsx` / `client.test.ts` use the new fields.
`node scripts/verify-browser-loop.mjs` (desktop and 375px) answered 32 rounds -
the first 2 as practice with no counter/score, progress held at 0% - then the
first scored round read `Round 1 / 30`.

Result:
Shipped 2026-06-12.

Commit:
Shipped (see git history).

Blocker:
None.

Next single task:
Design-token pass for the "laboratory ink and paper" identity.

## 2026-06-13 (S4)

Session goal:
Establish the "laboratory ink and paper" visual identity as semantic design
tokens and self-hosted fonts, with no layout or DOM change.

Changed:
Added semantic CSS custom properties in `src/styles/tokens.css` (warm paper
surfaces, sumi ink, vermillion accent, thesis-figure modality trio, AA-annotated).
Self-hosted OFL fonts via `@fontsource` (LINE Seed JP body + stimulus kana, Zen
Maru Gothic display headings, Zen Kaku Gothic New body fallback; Latin+Japanese
woff2 subsets). Trial cards moved onto `--surface-raised` for contrast. `app.css`
consumes tokens only; layout/DOM untouched. Added dev-only `/styleguide.html`
(excluded from build) rendering palette, pairings, and feedback states.

Proof:
`npm run build` / `npm run lint` green; `node scripts/verify-presentation-logic.mjs`
green (DOM/strings unchanged). Visual identity decisions recorded in memory.

Result:
Shipped 2026-06-13.

Commit:
Shipped (see git history).

Blocker:
None.

Next single task:
Bring the frontend repo's session-logging/checklist workflow to parity with the
backend (this session).

## 2026-06-20 (frontend workflow parity)

Session goal:
Docs/process only - bring the frontend repo's session-logging and checklist
workflow to parity with the backend so autonomous and manual sessions log
identically going forward, per the workflow-parity spec (since archived to
`docs/instruction-archive/SPEC-frontend-workflow-parity.md`). No source
or behavior change.

Changed:

- Created this `docs/progress-log.md` in the backend's exact format, backfilled
  terse S1–S4 entries from the `CLAUDE.md`/`AGENTS.md` punch list, and added this
  session as the latest entry.
- Reconciled `docs/frontend-grading-checklist.md`: brought it current with the
  shipped S1–S4 state, added a frontend-owned "Experiment invariants" section
  (verbatim `displayForm` render, frozen `experimentText.ts` strings,
  reserved-layout / no-mid-trial-shift, position-only aria-labels, condition
  mapping, the verify scripts as gates), and added dated 2026-06-20 evidence.
- Added one line to the agent-instructions file's "Verification & completion
  rule" requiring a `docs/progress-log.md` entry after each session.
- Touched nothing outside `docs/` and the agent-instructions file. Did not touch
  `experimentText.ts`, `app.css`, `tokens.css`, `main.tsx`, or any component.

Proof:
`npm run lint` green; `npm run build` green;
`node scripts/verify-presentation-logic.mjs` green (oracle - proves frozen
strings, verbatim render, and reserved-layout slots are untouched, i.e. no
behavioral change). The three docs exist in the required format. No browser-loop
run needed - no loop-affecting change.

Result:
Complete. Frontend and backend now log session history in the same format and
maintain parallel grading checklists.

Commit:
Not committed (proposed message in the handoff).

Blocker:
None.

Next single task:
Game-loop polish (transition timing, feedback readability, mobile tap targets) -
a separate, human-in-the-loop session, out of scope for this docs-only run.

## 2026-06-28 (spec archival)

Session goal:
Docs-only cleanup - archive the now-implemented workflow-parity spec into
`docs/instruction-archive/`. No app, component, or style change. (Plus a
user-approved one-line eslint-ignore fix, below.)

Changed:

- `git mv docs/SPEC-frontend-workflow-parity.md
  docs/instruction-archive/SPEC-frontend-workflow-parity.md` (preserved, not
  deleted; rename keeps history).
- Updated the one inbound reference in this log's 2026-06-20 entry to point at the
  archived path.
- `eslint.config.js`: added `ds-bundle` to `globalIgnores` (was only `dist`).
  Lint was scanning `ds-bundle/_ds_bundle.js` - a gitignored, untracked local
  design-system build artifact that inline-disables `jsx-a11y`/`react-hooks`
  rules this flat config doesn't register, producing 3 "rule not found" errors
  unrelated to any committed source. User approved this config-only fix.
- Touched no participant-facing or behavioral code: `experimentText.ts`,
  `app.css`, `tokens.css`, `main.tsx`, and all components are untouched.

Proof:
`npm run lint` green; `npm run build` green; `npx tsc --noEmit` green;
`npm test` green (35/35); `node scripts/verify-presentation-logic.mjs` green
(oracle - frozen strings, verbatim render, and reserved-layout slots untouched).
Tripwire scan clean: no port `8080`, no `/api/rounds/next` (the live endpoint is
`/api/game/sessions/{uuid}/rounds/next`, matching the contract), `TEXT_ONLY`
present only in a test asserting it resolves to `unknown`.

Result:
Complete. Implemented spec archived; lint restored to green; no behavioral change.

Commit:
Not committed (proposed message in the handoff).

Blocker:
None. (Noted for later, not addressed here: `npm audit` flags 2 vite advisories
- 1 high/1 low, dev-server `server.fs.deny` bypass on Windows alt paths; and the
untracked 21M `ds-bundle/` local artifact carries a `_ds_needs_recompile` flag.)

Next single task:
Game-loop polish (transition timing, feedback readability, mobile tap targets) -
a separate, human-in-the-loop session.

## 2026-07-02 (27C - mode shell + game-loop polish, NIL-38)

Session goal:
Multi-mode shell (home/mode-select surface, view-state only, no router) so 27D
(Rating Lab) and 28B (Modality Ladder) can slot in, plus feedback-card and
instructions polish - tokens only, all participant-facing wording unchanged.

Changed:
- `src/modes.ts` (new): data-only mode registry (`choosing` available;
  `rating`/`ladder` coming-soon). Future modes flip `status` here and add a
  view branch in App - ModeSelect never changes.
- `src/components/ModeSelect.tsx` (new): "Choose a mode" home screen; three
  mode cards; coming-soon entries native-`disabled` + `aria-disabled` with a
  visible "Coming soon" pill (honest placeholders, full-opacity muted ink).
- `src/App.tsx`: `AppView` gains `"home"`; auth lands on home; new
  `handleModeSelect`/`handleBackToHome` (shared `resetSessionState()` factored
  from `handleBackToStart`, which still targets instructions); logo click →
  home; completion panel gains a secondary "Back to modes" button.
- `src/components/Instructions.tsx`: optional `onBackToHome` prop renders a
  "Back to modes" secondary button under the h1. No wording changes.
- `src/styles/app.css`: new `.mode-*` block (tokens only; 1-col ≤860px);
  feedback block tokenized (grid/card gaps, paddings, h2 `--text-xl`→`--text-lg`
  so the kana anchors the panel) + correct-card emphasis via
  `.feedback.incorrect .feedback-choice-card:last-child` (green border/title,
  raised surface - CSS only, JSX untouched); instructions density pass
  (`1.35rem`→`--text-md`, paragraph rhythm `2rem`→`--space-4`, selector/toggle/
  sound-check spacing tokenized, `.practice-toggle` min-height 44px); @640px
  feedback literals snapped to the token scale.
- Deleted dead `src/pages/` (HomePage/NotFoundPage/ResultsPage stubs) and
  uninstalled `react-router-dom` (was never wired; user approved).
- `scripts/verify-browser-loop.mjs`: register → wait "Choose a mode" → assert
  Rating Lab + Modality Ladder are disabled mode cards → click "Choosing Task"
  → existing instructions waypoint.
- New tests: `src/modes.test.ts` (registry shape + wording guard),
  `src/components/ModeSelect.test.tsx` (3 cards, disabled semantics + badge),
  `src/components/Instructions.test.tsx` (condition options, practice label,
  sound-check gating, conditional Back to modes).
- Docs: README gains a "Mode select" paragraph in Trial flow.

Proof:
`npm run lint` green; `npm run build` green; `npm test` green (45/45, 12 files);
`node scripts/verify-presentation-logic.mjs` green (TrialPlayer/StimulusDisplay/
conditionPresentation untouched); `node scripts/verify-browser-loop.mjs` green
desktop AND 375px (exit 0 both; stale backend jar rebuilt first - it predated
the Jun-12 practice/shuffle commits). CDP screenshots: home 3-column at 1280px /
stacked at 375px, condensed instructions with Back to modes, feedback correct/
incorrect with green correct-card emphasis, completion with Play again +
Back to modes. Tap-target audit via CDP: no interactive element under 44px at
375px. Tokens grep on the diff: only additions without `var(--…)` are
`min-height: 44px` (existing button idiom) and `width: min(100%, 760px)`
(matches the shared panel-width rule).

Result:
Complete. Choosing Task flow unchanged end-to-end; shell ready for 27D/28B.

Commit:
Not committed (commits are the user's).

Blocker:
None. (Pre-existing, untouched: `npm audit` 2 vite advisories.)

Next single task:
27D - Rating Lab UI (NIL-39): flip `rating` in `src/modes.ts`, add the rating
view branch; backend ready (`GET /api/game/me/ratings` paginated → `.entries`,
public `GET /api/research/divergence`).

## 2026-07-02 (27D - Rating Lab wired to the API, NIL-39)

Session goal:
Rating Lab playable end-to-end: 1–7 resemblance rating against POST
/api/ratings + paginated GET /api/game/me/ratings, with the public
GET /api/research/divergence read surfaced to the player.

Changed:
- `src/experimentText.ts` + test: frozen Rating Task block (adjudicated
  2026-07-02, Gorilla/thesis verbatim from
  `docs/research/design-archive/gorilla-rating-task-*.png`; instructions are
  Gorilla-adapted with a dynamic word count, time estimate dropped; count
  unbolded, 1/7/anchor phrases bolded).
- `src/api/types.ts` / `src/api/client.ts` + test: `RatingRequest/Response`,
  `RatingPageResponse`, `DivergenceEntry`; `submitRating`, `getMyRatings`,
  `getAllMyRatings` (paged walk), `getDivergence`.
- New `src/ratingPool.ts` + test: contamination-free word pool - words enter
  only via answered non-practice rounds (mapping from
  `AnswerResultResponse.correctIdeophoneId`; never guessed client-side),
  deduped, persisted per user (`ideophone-arena-rating-pool`, versioned,
  username-scoped so accounts never see each other's pools).
- New `src/components/RatingLab.tsx` + test, new `src/labRecord.ts`: pure
  panels (instructions with dynamic n, Gorilla-layout trial with audio-only
  neutral card + replay, arena-record reveal, Lab record table, empty state)
  under a stateful container (loading/instructions/rating/submitting/
  revealed/done/empty/error). Queue = unrated pool words; 409 recovered as
  read-only "already rated"; stale sessionUuid retried once without it;
  unknown-ideophone 404 reveals-and-moves-on; divergence failure never blocks
  rating. `aria-pressed` scale buttons ≥44px, reveal slot reserved from first
  paint with `aria-live="polite"`; response time anchored at trial mount,
  integer, clamped.
- `src/modes.ts` flip + `src/App.tsx`: `rating` view, pool accumulation in
  `handleAnswered` + persistence, completion-panel "Rate these words" CTA;
  lockstep updates to `modes.test.ts` / `ModeSelect.test.tsx`.
- `src/styles/app.css`: `.rating-*` block (tokens only; vermillion `.selected`
  fill per the Gorilla reference, 640px stacked anchors, 400px tightened gap,
  reduced-motion guard, record-table scroll wrapper).
- `scripts/verify-presentation-logic.mjs`: compiles RatingLab, pins all rating
  strings verbatim, asserts trial markup (strings once, 7 buttons, no
  canonicalForm/romaji leak, reserved reveal slot).
- `scripts/verify-browser-loop.mjs`: Rating Lab asserted enabled (disabled
  list now just Modality Ladder) + new post-completion rating waypoint (CTA →
  instructions → rate 4 → Next → arena-record reveal). Robustness fixes found
  during proofing: sound-check activation now retries mouse/touch and leads
  with a trusted focused-button Enter keypress (pointer coordinates
  intermittently miss under 375px mobile emulation - page scroll/reflow
  between measurement and dispatch); reveal matched case-insensitively
  (CSS-uppercased label).
- Docs: `docs/backend-contract.md` gained the previously-missing Ratings +
  Research divergence sections (409-not-upsert, null zero-n semantics);
  README mode-select/Rating Lab; grading checklist Rating Lab block.

Proof:
`npm run lint` / `npm run build` / `npm test` (85 tests, 14 files) green;
`node scripts/verify-presentation-logic.mjs` green;
`node scripts/verify-browser-loop.mjs` desktop AND 375px exit 0 - both runs
answered 32 rounds to completion and passed the rating waypoint
(7-button scale, reveal visible, rating confirmed; no horizontal overflow;
0 console errors). CDP manual proof (desktop): pool = 60 words, 0 practice,
username-scoped; instructions counted 57 unrated with the already-rated note;
out-of-band conflict then UI submit → 409 recovery showing "rating stands at
3"; clean UI submit → 201 with `{rating: 2, responseTimeMs: 1415 (integer),
sessionUuid}` and reveal incl. mean-rating line; re-entry showed 55 remaining
(rated words skipped); fresh user saw the empty state + Choosing CTA (pool
isolation). Screenshots: trial + reveal match the Gorilla reference (selected
number filled vermillion, reserved reveal slot).

Result:
Complete. Rating Lab playable end-to-end (NIL-39 exit criterion).

Commit:
Not committed (commits are the user's).

Blocker:
None. Notes: mid-trial rating escape is the site-title header (same as the
Choosing trial); divergence is a full-table fetch per submit (fine at demo
scale, noted in contract doc).

Next single task:
W29 landing / welcome page (divergence read is also available for it), or
28B Modality Ladder per roadmap - user's pick.

## 2026-07-03 ("27E: meaning lines follow the seed draw + API-sourced rating pool (NIL-40)")

Session goal:
Consume server truth instead of client-side derivation, closing W27: (a) order the trial's two meaning lines by the
round's seed-drawn `targetMeaningListedFirst` (new on the round DTO); (b) retire the username-scoped localStorage
rating pool and source the Rating Lab pool from the new `GET /api/game/me/ratable-words` - the localStorage pool
broke for any multi-device hosted user (W30 blocker).

Changed:

- `src/api/types.ts`: `RoundResponse.targetMeaningListedFirst: boolean` (+ comment); new `RatableWordResponse` /
  `RatableWordPageResponse`. `src/api/client.ts`: `getRatableWords` + `getAllRatableWords` (page walker mirroring
  `getAllMyRatings`; shared cap renamed to `PAGE_WALK_MAX_PAGES`).
- `TrialPlayer.tsx`: the frozen line prefixes stay in place ("One of them means …" always first); the flag decides
  which gloss fills which line; a missing flag (older backend) keeps the historical target-first order. Question
  wording, left/right word placement, and kana rendering untouched; `experimentText.ts` untouched.
- `src/ratingPool.ts` is now a thin client: `RatingPoolWord` = the endpoint entry type, `fetchRatingPool()` walks
  the pages. localStorage read/write path and the `ideophone-arena-rating-pool` key deleted - discarded without
  migration (only pre-deploy test data existed).
- `RatingLab.tsx` fetches the pool itself (parallel with `getAllMyRatings`; same error/auth handling and retry);
  the `pool` prop is gone; instructions' already-rated count now comes from the ratings map; ratings POST without
  `sessionUuid` (server-pool words carry no provenance - the dead stale-session fallback helper was removed).
  Empty state and 409 recovery unchanged. `App.tsx` dropped the whole pool pipeline (state, seeding, extract/write
  on answer); the completion "Rate these words" CTA is now unconditional (a completed session always leaves
  encountered words).
- Tests: fixtures gained the required flag (`TrialPlayer`, `FeedbackPanel`, `roundValidation`, `RatingLab` pool
  word); new `TrialPlayer` meaning-line order block (flag true / flag false swaps glosses but never prefixes /
  absent flag defaults target-first); `ratingPool.test.ts` rewritten for the thin client (page walk, order,
  empty); `client.test.ts` covers `getRatableWords` + `getAllRatableWords`. Suite: 80 tests (was 85: the 15
  localStorage-pool tests died with the module; 10 new added; all 70 surviving tests untouched and green).
- `scripts/verify-presentation-logic.mjs`: client stub gained the two new exports.
- `scripts/verify-browser-loop.mjs` extended: per-round meaning-line assertion against the round's own captured
  `rounds/next` payload (bound to the on-screen round via the question gloss; never a two-session diff), both
  orders required across the session, a refetch-determinism probe (same round fetched twice -> same draw), a
  ratable-words waypoint (network call observed + legacy localStorage key never written + instructions word count
  equals the served pool), and a fresh-client pool-parity check (Node logs into the same account and must see the
  browser's pool minus the just-rated word, order-stable across two fetches). Also made the post-reload "Register"
  click retry (pre-existing cold-start race).
- Docs: `docs/backend-contract.md` (round DTO flag paragraph; ratable-words section replaces the "no endpoint"
  claim; no more `sessionUuid` on ratings), `docs/frontend-grading-checklist.md` (pool + ratings-POST items
  rewritten for 27E), `README.md` (pool line).

Proof:

- `npm run lint` clean; `npm run build` (tsc -b + vite) clean; `npm test` -> 80 passed (14 files);
  `node scripts/verify-presentation-logic.mjs` -> "Presentation logic verified."
- `node scripts/verify-browser-loop.mjs` desktop AND 375px, both green end-to-end against the rebuilt backend.
  Desktop 27E numbers: 32 rounds asserted, meaning-line order matched each round's flag every time
  (targetFirst 15 / otherFirst 17 - both orders exercised), refetch probe stable
  (`roundId` 91, flag `false`, twice identical); ratable-words requests observed (4, all 200),
  `ideophone-arena-rating-pool` key absent, instructions said 60 words = served pool 60; fresh-client parity:
  59 ids = browser pool minus the rated word, order stable across two fetches. 375px numbers: 32 rounds,
  targetFirst 20 / otherFirst 12, refetch stable, pool 60, legacy key absent, parity 59 ids exact.

Result:
Complete. Meaning-line order is now server truth end-to-end, and the Rating Lab pool follows the account instead of
the browser - the W30 multi-device blocker is cleared. NIL-40 exit criteria all met.

Commit:
Not committed (commits are the user's). Proposed message:
"order meaning lines by the round flag and source the rating pool from the API (NIL-40)" - body: TrialPlayer fills
the frozen meaning-line prefixes by targetMeaningListedFirst (target-first fallback for older payloads);
ratingPool.ts becomes a thin client of GET /api/game/me/ratable-words (localStorage pool retired, no migration);
RatingLab fetches its own pool and rates without sessionUuid; browser loop asserts flag-vs-DOM per round, refetch
determinism, API-sourced pool, and fresh-client parity.

Blocker:
None.

Next single task:
NIL-62 free-form-entry build, from the kickoff prompt the NIL-57 architecture session emits (NIL-57 itself is a
chat session, not Claude Code).

## 2026-07-04 (NIL-65)

Session goal:
Land the adopted `docs/specs/UI-SYSTEM.md` (NIL-64): migrate to Tailwind v4 + selective shadcn/ui chrome, restyle
the bespoke experiment surfaces on the same tokens, add the §11.3 guards, and carry the two named riders - all
presentation-layer, zero behavior change otherwise.

Changed:
- Wiring: `vite.config.ts` (@tailwindcss/vite plugin). `tokens.css` rewritten hex→`oklch()` with hex provenance
  comments (all round-trip byte-identical; verified), plus the new token groups - §3.2 `--text-prompt/-question`,
  §3.3 kana-hero/hero/xl-form + `--font-stimuli-latin`, §4.4 KOKE `--accent-haptic{,-soft,-hover,-active}`
  (ledger L1), §7 `--motion-micro/reveal/spin`, §2.1 `--container-app/read/form`. New `src/styles/theme.css`
  (`@theme inline` mapping tokens→Tailwind namespaces by `var()` reference, zero value duplication) and
  `src/styles/shadcn-bridge.css` (shadcn var→token bridge; deliberately omits shadcn's `--accent` to avoid the
  documented collision with our vermillion `--accent`). `src/lib/utils.ts` (`cn` via `extendTailwindMerge`).
- Tailwind imported WITHOUT preflight and legacy `app.css` wrapped in `@layer app` (deviation from §4.6's
  illustrative `@import "tailwindcss"`): preserves the reserved-slot geometry (invariant 5) that preflight would
  reset, while utilities still win where shadcn chrome appends them. The button chrome preflight would have reset
  is neutralized by one global `button { appearance:none; background:transparent; border:0 solid }` rule.
- shadcn component set (`src/components/ui/*`): Button, Card, Input, Label, Tabs, Table, Dialog, Checkbox, sonner
  - hand-authored Tailwind-v4 style, themed via the bridge, motion `motion-safe:`-gated, vermillion outline focus
  (§6), inline Lucide SVG paths (no icon dep), no tw-animate-css.
- Chrome → shadcn: AuthForm (Tabs/Input/Button), Leaderboard (Table + Button pager), completion actions/score-view
  switcher (Button + Tabs), logout (ghost Button), Instructions Start/Sound-check/Back (Button); `<Toaster/>`
  mounted (themed, staged - no triggers wired). Dialog staged (unused this session).
- Bespoke deltas in `app.css`: §1 surface grammar (complete/error panels → washi+border, no shadow;
  rating-reveal gains `--shadow-card`; condition options rest→washi + hover-lift); §3.2 prompt/question tokens
  (media-query font literals removed, clamps subsume them); §7 motion gated (progress-track transition +
  interactive-surface transitions all `prefers-reduced-motion: no-preference`); §2.1 container tokens; §2.3
  six-mode shell (auto-fill grid, measure chip, reserved status slot). Reserved-slot constants (§2.4) byte-unchanged.
- Rename sweep (§10.2, chrome literals only): `modes.ts` (Meaning Match / Rating Lab / Perception Ladder + measure
  chips), `Instructions` h1, `RatingLab` "Choosing Task"→"Meaning Match" (4 player-facing spots). Internal ids /
  API values / frozen `experimentText.ts` untouched. `verify-browser-loop.mjs` mode-name assertions updated to
  the adopted slate (required - the loop asserts those literals).
- Riders: (a) `labRecord.ts` word-meta cache (`rememberWordMeta`/`readWordMeta` + 4th `fallbackMeta` param on
  `buildLabRecordRows`) so a word rated in an earlier visit still shows romaji/gloss when divergence fails and it
  has left the pool; wired in `RatingLab`. (b) `lang="ja"` on the kana display elements (StimulusDisplay
  `.script-display-text`, FeedbackPanel `.feedback-display-form`) - attribute only.
- Test repairs (§11.2): FeedbackPanel/StimulusDisplay/TrialPlayer/Leaderboard/Instructions component tests +
  `verify-presentation-logic.mjs` moved from exact-markup to hook/prefix/attribute idioms; the shadcn Button's
  `disabled:` utility classes forced the disabled checks to assert the `disabled=""` attribute. New guards:
  `src/semanticHooks.test.tsx` (stable-hook contract) and `scripts/verify-token-purity.mjs` (hex + motion-gate).
- Deviations (browser-loop compatibility, consistent with each other): Instructions practice toggle stays a native
  `input[type=checkbox]` (Radix Checkbox has no `input`, which the loop queries); AuthForm inputs stay descendants
  of native `<label>` (loop associates by wrapping); mode cards stay `<button class="mode-card">`. The auth/
  completion Tabs ARE shadcn Radix - the loop's two tab activations were switched from `element.click()` to
  focus+Enter (`trustedPressEnterOnText`), which Radix activates on `onFocus` and which is immune to the mobile
  coordinate drift; `element.click()` fires no mousedown so Radix ignored it.

Proof:
- `npm run lint` clean; `npm run build` (tsc -b + vite) clean; `npx vitest run` → 83 passed (15 files, +2:
  semantic-hook contract, lab-record fallback); `node scripts/verify-presentation-logic.mjs` → "Presentation logic
  verified."; `node scripts/verify-token-purity.mjs` → "Token purity and motion gating verified."
- `node scripts/verify-browser-loop.mjs` full green at desktop (explicit 1280px) AND 375px against the live
  backend + fresh Vite dev server, headless Edge CDP:
  - 1280px: 32 rounds, 2 practice served first, first scored round Round 1/30 score 0/0, all 5 phase geometries
    stable (invariant 5), meaning-order both directions (16/16), refetch stable, audio-only 2 placeholders /
    0 visible media, pool parity 60→59, leaderboard 10 rows + pager page 1/8, recent-attempts tab OK, no
    horizontal overflow (1265≤1280), 0 relevant console errors.
  - 375px: 32 rounds, 5 phase geometries stable, both meaning orders (15/17), rating 7/7 + reveal, pool parity
    60→59, recent-attempts tab OK, no overflow (388≤388), 0 console errors, 0 muted media, 0 stale controls.
- Screenshots captured both viewports (`/tmp/{practice-round,feedback-correct,feedback-incorrect,leaderboard,
  leaderboard-page-2}-{1280px,375px}.png`); trial-board geometry sampler passed (reserved slots identical across
  phases at both viewports). §4.5 contrast spot-check: default Button text computes to `--ink-inverse` (light) on
  `--accent` (verified via CDP getComputedStyle) after the merge fix below.
- Adversarial multi-lens review workflow (12 agents) over the diff surfaced 2 confirmed defects, both fixed and
  re-verified: (1) omitted preflight left shadcn fill/ghost/link + TabsTrigger with native UA button chrome →
  fixed by the global `button` appearance reset (verified: `appearance:none`, `border-top-width:0`, clean
  vermillion CTA screenshot); (2) `verify-token-purity.mjs` hex strip regex was consuming all 4/6/8-digit hex →
  guard silently missed `#rrggbb` → fixed (strip removed, `\b` handles SHA runs, `/styleguide` skipped;
  self-tested). A third defect found in visual verification: `tailwind-merge` conflated `text-ui` (custom size)
  with `text-ink-inverse` (color) and dropped the color → black button text → fixed via `extendTailwindMerge`
  registering the custom font-size roles (verified live: color back to ink-inverse).

Result:
Complete. The app is on Tailwind v4 with themed shadcn chrome and bespoke surfaces restyled on the same tokens;
full proof battery green at desktop and 375px; the "ink and paper" identity, surface grammar, and reserved-slot
geometry all hold. 28B / NIL-63 / NIL-62 / NIL-43 build on this foundation. Post-build `.design-sync` chores
(spec §12: re-run build-css, re-validate conventions.md, fix stale componentSrcMap rows) are deferred to a
follow-up per the spec - NOT run this session.

Commit:
Not committed (commits are the user's - expected). Uncommitted tree: 22 modified + untracked `src/components/ui/`,
`src/lib/`, `src/styles/{theme,shadcn-bridge}.css`, `src/semanticHooks.test.tsx`, `scripts/verify-token-purity.mjs`,
`pnpm-lock.yaml`, plus the pre-existing doc additions (`docs/specs/UI-SYSTEM.md`, `docs/design/`).

Blocker:
None.

Next single task:
NIL-63 per-card replay build per `UI-SYSTEM.md` §8 (icon replay button in `IdeophoneCard`, `--motion-spin`, kana-
measure guard, browser-loop replay waypoint), on this Tailwind/shadcn foundation.

## 2026-07-04 (NIL-69 - Tailwind/shadcn harmonization, §16 H1–H8)

Session goal:
Execute `UI-SYSTEM.md` §16 (H1–H8, NORMATIVE): retire the NIL-65 as-built workarounds to a stock-looking Tailwind
v4 + shadcn setup - preflight enabled, standard token names, restored shadcn `--accent` bridge, standard utility
surface with `extendTailwindMerge` gone, pnpm-only. Bar: pixel parity (zero visual change), full battery green at
desktop + 375px. Presentation-layer only; token *values* untouched (names only). No behavior change, no commits.

Changed:
- H8 (pnpm): deleted `package-lock.json`; pinned `"packageManager": "pnpm@11.3.0"` in `package.json`.
- H2 (token rename, values byte-identical): `tokens.css` vermillion trio `--accent{,-hover,-active}`→`--vermillion*`
  and modality families `--accent-<mod>{…}`→`--modality-<mod>{…}` (+ internal `--focus-ring` ref, prose comment);
  `theme.css` `--color-accent*`→`--color-vermillion*`, modality utilities keep short names with `var(--modality-*)`
  RHS; `app.css` 15 refs; `styleguide.css` (6 defs + refs); `StyleGuide.tsx` 9 swatch token literals;
  `shadcn-bridge.css` `--primary`/`--ring` refs. Vermillion utilities in `button/checkbox/tabs/dialog/input.tsx`
  (`bg-accent`/`outline-accent`/`border-accent`/`text-accent`… → `-vermillion`) - this consumer rename is required
  for parity (H3 re-points `bg-accent` at the surface-card wash) and was not in the raw work order.
- H3 (bridge restored): `shadcn-bridge.css` `:root` + `@theme` now define `--accent: var(--surface-card)` /
  `--accent-foreground: var(--ink-primary)` (stock wiring); collision comment rewritten; `button.tsx` ghost reverted
  from the `hover:bg-muted` patch to stock `hover:bg-accent hover:text-accent-foreground` (same surface-card wash).
- H4 (standard utility surface): `theme.css` `@theme` font-size map restricted to `xs/sm/base/lg/xl/2xl` (the
  `ui/md/prompt/question/kana-*/hero/xl-form` roles stay tokens in `tokens.css` for `@layer app`/arbitrary use);
  `button.tsx`×3 + `tabs.tsx` `text-ui`→`text-[length:var(--text-ui)] leading-[1.2]`, `card.tsx` `text-md`→
  `text-[length:var(--text-md)]` (kept explicit leading); `lib/utils.ts` `extendTailwindMerge`→stock `twMerge`.
- H1 (preflight ON): `app.css` head → `@import "tailwindcss";` (preflight into `base`, layer order pre-declared);
  deleted the global `button` appearance reset. One compensating rule added in `@layer app` where the audit showed
  drift: `body { line-height: normal }` (preflight sets root 1.5; the pre-preflight design inherited `normal`).
  H5/H6/H7 kept as-is.
- Font removal (user-approved remove+trim; the packages were dev-styleguide-only, not unimported as the brief
  assumed): `pnpm remove @fontsource/{kaisei-decol,klee-one,rocknroll-one}`; dropped their imports in
  `styleguide/main.tsx`, the 3 candidate pairings in `StyleGuide.tsx`, and their `.sg-pair-{b,c,d}` +
  RocknRoll-weight blocks in `styleguide.css`.

Proof:
- Battery green after every step and at exit: `pnpm lint` · `pnpm build` · `pnpm vitest run` (83) ·
  `verify-presentation-logic.mjs` · `verify-token-purity.mjs`; `verify-browser-loop.mjs` full pass at desktop AND
  375px.
- Invariant-5: browser-loop `phaseGeometry` - 120 numeric fields across all 5 phases BYTE-IDENTICAL to the
  pre-session baseline at both viewports (§2.4 constants intact: fixation stage 760, cards 320×180 / 343×193).
  H1 revert criterion NOT triggered.
- Chrome parity (CDP computed-style probe, auth screen, both viewports): submitButton/input pixel-identical;
  primary button bg = vermillion `oklch(0.5634 0.1781 34.51)`, text = ink-inverse `oklch(0.9798 0.0086 84.57)`
  (proves the NIL-65 twMerge color-drop stays fixed under stock `twMerge`); size 17.6px/21.12px unchanged; shadcn
  `--accent` wash resolves to surface-card; ghost `hover:bg-accent` == old `bg-muted`. CardTitle (unmounted)
  synthetic check 19.2px/23.04px. Auth geometry re-measured identical after the line-height compensation.
- Exit greps: `--accent` in `src/` only in `shadcn-bridge.css`; zero named custom-size `text-<role>` utilities in
  TS/TSX. Styleguide `/styleguide.html` renders (1 pairing, no removed-font refs, zero console errors).
- Screenshots (auth 1280/375, trial-board+feedback, completion+leaderboard) visually identical to baseline.

Result:
Complete; all H1–H8 landed, no revert. Only computed-style delta anywhere is `button { appearance }` `none→button`
on shadcn TabsTriggers (preflight-owned) - pixel-inert: preflight's universal `border:0` + explicit trigger
backgrounds + flex centering render nothing native, and the tabsList box is identical on/off. Left uncompensated
per §16 H1 ("preflight owns it; compensate only where drift shows"), keeping the setup vanilla.

Commit:
Not committed (commits are the user's - expected). Uncommitted tree: `package-lock.json` deleted; `package.json`,
`pnpm-lock.yaml`, `src/styles/{tokens,theme,app,shadcn-bridge,styleguide}.css`, `src/components/ui/{button,card,
checkbox,dialog,input,tabs}.tsx`, `src/lib/utils.ts`, `src/styleguide/{main,StyleGuide}.tsx` modified.
`docs/specs/UI-SYSTEM.md` was already modified pre-session (the re-copied §16 canon).

Blocker:
None.

Next single task:
NIL-63 per-card replay build per `UI-SYSTEM.md` §8 + §12 riders (icon replay button in `IdeophoneCard`,
`--motion-spin`, kana-measure guard, browser-loop replay waypoint), on this harmonized foundation.

## 2026-07-04 (NIL-63)

Session goal:
Ship the §8 per-card replay affordance on every ideophone card (retiring Gorilla's four-card
workaround), unify Rating Lab's replay to the same control language, add the browser-loop replay
waypoint, and land the deferred §12 `.design-sync` riders. Presentation/affordance layer only - no
change to trial flow, scoring, or phase timing.

Changed:
- `src/components/IdeophoneCard.tsx`: wrap the card in a `.card-slot` positioning context and render a
  sibling icon `<button class="card-replay-button">` (inline Lucide `rotate-cw`, `aria-label="Replay
  card A/B"`, `stopPropagation`) when `onReplay && replayVisible` - never nested in the choice button.
  New props `onReplay`/`replayVisible`/`replayDisabled`; `.has-replay` on the card drives the kana
  guard. Icon spin restarts per click via a `spinCount` React key (only after the first click, never on
  mount); a JS-timer `is-active` flag drives the reduced-motion pulse.
- `src/components/TrialPlayer.tsx`: per-card `replayCount`/`replaying` state (reset per round via the
  App's roundId-keyed remount); `autoplayToken = roundId*100 + replayCountA` (A) / `+50 + replayCountB`
  (B); `mediaPlaying = playFlag || replaying`; `onReplay` bumps count + sets replaying; phase-swapped
  `onEnded` - during choice/feedback it only clears `replaying`, so `handleRightEnded` never re-fires
  and the RT anchor is untouched; `replayVisible = choice||feedback`. `performance.now()` anchors and
  phase machine unchanged.
- `src/components/StimulusPlayback.tsx`: unchanged. The engine is reused as-is; `onEndedRef` already
  reads the current handler, so the phase-dependent `onEnded` swap is closure-safe.
- `src/styles/app.css`: `.card-slot`; `.card-replay-button` (36px circle, 44×44 `::before` hit area,
  `--surface-raised`/`--ink-primary`/`--radius-pill` DNA, hover→`--vermillion`, focus ring); spin
  `@keyframes` gated inside a `prefers-reduced-motion: no-preference` block; reduced-motion `is-active`
  border→`--vermillion` inside a `reduce` block (a plain color change, no transition/animation - the
  token-purity motion gate stays green). Kana-measure guard on
  `.ideophone-card.has-replay .text-display:not(.revealed-display) .script-display-text`
  (`max-width: calc(100% - 2*(36px + var(--space-2)))`) - pre-feedback faces only. `.rating-replay-button`
  restyled to an icon+label pill.
- `src/components/RatingLab.tsx`: the replay button gains the same inline `rotate-cw` icon (keyed spin)
  before the frozen `RATING_REPLAY_BUTTON` = "Replay" (string untouched; `experimentText.ts` untouched).
- `src/semanticHooks.test.tsx`: `card-replay-button` added to `PINNED_HOOKS` and rendered in the battery.
  `src/components/IdeophoneCard.test.tsx`: identity-symmetry test (A/B replay markup byte-identical
  modulo the position label).
- `scripts/verify-browser-loop.mjs`: replay waypoint in the choice phase (once) - instruments
  `HTMLMediaElement.prototype.play`, asserts 2 controls + A/B byte-identical markup, clicks card A's
  `.card-replay-button`, asserts a second `play()` and unchanged phase/selection; `.stimulus-row button`
  → `.stimulus-row .choice-button` (the row now holds 4 buttons).
- §12 riders: re-ran `.design-sync/build-css.mjs` (bundle 1152→1709 lines - gains the post-migration
  Tailwind layer + replay CSS; gitignored artifact); removed the dead `componentSrcMap` rows +
  previews for `HomePage`/`ResultsPage`/`NotFoundPage` + the `router-reexport.mjs` extraEntry (react-
  router is gone since 27C); re-validated `conventions.md` (`--accent*`→`--vermillion*`, modality →
  `--modality-*`, added `.card-slot`/`.card-replay-button`, corrected the router prose); updated
  `NOTES.md`. `README.md`: one-line replay note in the browser path.

Proof:
- Static battery green at exit: `pnpm lint` · `pnpm build` · `pnpm vitest run` (84 - was 83 + the
  symmetry test) · `node scripts/verify-presentation-logic.mjs` · `node scripts/verify-token-purity.mjs`.
- `verify-browser-loop.mjs` full pass (exit 0, `relevantConsoleErrorCount: 0`) at BOTH desktop and 375px,
  including the new replay waypoint. (The two 375px false-starts were the documented Edge-occlusion /
  Web-Audio-throttling flake - "Timed out waiting for choice phase" and a leaderboard-pager CDP hang,
  both unrelated to the trial-phase changes; a background `/json/activate` tab poller kept the tab
  foreground and the run then passed clean. Noted in the browser-proof-environment memory.)
- Waypoint (both viewports): 2 replay controls in choice, A/B byte-identical markup, card A's replay
  fires a second `play()`, and `.question-text`/no-`.feedback`/2 `.choice-button` confirm phase and
  selection are unchanged.
- Kana-measure guard (both viewports, injected そろりそろり at a pre-feedback face): `max-width: calc(100%
  - 88px)`, wraps to 2 lines, `clearsRightCorner: true` - screenshot shows the 6-mora word clearing both
  top corners (A-label and replay control) symmetrically.
- Reduced-motion (both viewports): icon `animationName: "none"` (spin gated off) and the screenshot shows
  the vermillion border pulse on the activated card only.
- Feedback-overflow fix: an early screenshot caught the guard force-wrapping a 4-mora katakana at the
  reveal (ニコニコ overflowing the fixed card). Scoped the guard to `:not(.revealed-display)`; re-verified
  ガタン / ゴツゴツ render on one line with romaji + meaning fitting at desktop and 375px.
- Screenshots at both viewports: choice + feedback with replay controls, 6-mora wrap, reduced-motion
  pulse, plus practice/leaderboard.

Result:
Complete. Every ideophone card carries the §8 replay control (icon-only, top-right, byte-identical A/B),
Rating Lab is unified to the same icon+label pill, the browser loop asserts the replay waypoint at both
viewports, and the four §12 riders landed. Reserved-slot geometry (§2.4) is byte-unchanged - the replay
button is out-of-flow and the guard narrows only the text measure. One design nuance surfaced and was
resolved in-session: the kana guard must not apply to the reveal face, or medium katakana overflows.

Commit:
Not committed (commits are the user's - expected). Uncommitted tree: modified
`src/components/{IdeophoneCard,TrialPlayer,RatingLab}.tsx`, `src/components/IdeophoneCard.test.tsx`,
`src/semanticHooks.test.tsx`, `src/styles/app.css`, `scripts/verify-browser-loop.mjs`, `README.md`,
`.design-sync/{config.json,conventions.md,NOTES.md}`; deleted
`.design-sync/previews/{HomePage,ResultsPage,NotFoundPage}.tsx` + `.design-sync/router-reexport.mjs`.
(`.design-sync/ds-bundle-styles.css` was regenerated but is gitignored.)

Blocker:
None. (375px browser proof needs a `/json/activate` tab poller to survive Web-Audio throttling in a
headless run - an environment workaround, not a code issue.)

Next single task:
28A/28B Perception Ladder (per `TASKS.md` sequence; M1 `game_mode` rides 28A).

## 2026-07-05 (NIL-78)

Session goal:
Build The Observatory v1.0 per `docs/specs/SPEC-stats-dashboard.md`: a separate read-only research
surface (new `AppView "observatory"`, not a mode card) with three live panels - modality dumbbell,
divergence scatter, word radar - vendored reference layers (thesis 30 pairs, McLean 2023 backdrop,
Iida & Akita norms), honest coming-soon slots, and the mandatory attribution footer. Frontend only;
the whole live API surface is the existing public `GET /api/research/divergence`.

Changed:
- `package.json` / `pnpm-lock.yaml`: the approved dep gate, exactly `d3-scale` + `d3-shape`
  (+ `@types/*` devDeps). d3 does math only; React owns all DOM.
- `data/observatory-sources/`: the three research CSVs (launcher-block copies) + `arena-pool.json`
  (68 pool words, API romaji + gloss, extracted once from the backend seed SQL, provenance in
  meta) + licensing/citation `README.md`.
- `scripts/build-observatory-data.mjs`: deterministic pipeline - hand-rolled RFC-4180 parser (the
  norms CSV has quoted embedded commas), strict blank-cell rejection (`Number("")` must not pass
  as 0), atomic validate-then-write (exit 1 writing nothing on any problem), run-twice idempotent.
  Thesis romaji canonicalized to the pool's authoritative spellings (sakutto/kiritto/hotto →
  sakuQ/kiriQ/hoQ - the CSV predates the sokuon renames) with pool-membership validation. Emits
  committed JSON into `src/data/observatory/`: `thesis-pairs` (per-pair z + `byModality`
  reproducing 68.6/64.2/59.7), `mclean` (wide, published z), `norms` (strict-equality arena join +
  build-time max-L1 default pair), `arena-pool`. Pins arena∩norms = 17 as a conscious-update
  constant.
- `src/data/observatory/`: vendored JSON + `types.ts` + `index.ts` (single cast boundary) +
  `data.test.ts` (committed-data integrity guard) + `README.md`.
- `src/observatory/chart/`: bespoke primitives - `kde.ts` (Epanechnikov, Silverman bandwidth with
  a 4%-of-span floor, peak-normalized), `wilson.ts` (successes clamped to [0, n] - no NaN CI from
  contract-violating input), `aggregate.ts` (null-safe weighted modality means, record totals,
  z-standardization gated on n ≥ 3 + spread, arena scatter builder with honest exclusion counts;
  never-played counted by romaji match, never pool − rows), `scales.ts`, `format.ts`
  (deterministic, no locale APIs), `axis.tsx`, `SpecimenLabel.tsx` (§3.4 primitive, HTML + SVG
  twins), `useChartSize.ts` (SSR-safe ResizeObserver), `CollapsedTable.tsx` (table twin - always
  in the DOM behind `hidden`, plain state toggle, no Radix).
- `src/observatory/panels/ModalityDumbbell.tsx`: thesis ink vs live vermillion dots with printed
  values as the CVD carrier, `CHANCE · 50%` hairline, hollow dots under 30 live guesses, `N = …`
  row labels (`N = - ` when the record is unreachable - null is not zero), short row labels under
  520 px, practice-traffic disclosure in the figcaption.
- `src/observatory/panels/DivergenceScatter.tsx`: three layers (McLean strata by shape + neutral
  ink-family fills; thesis ink; arena vermillion - reserved-color audit clean), Epanechnikov KDE
  marginals per layer, y = z within study (adjudicated; arena suppressed under 3 rated words with
  the honest note), pointer-events tooltips (hover + tap + focus; owner-scoped blur so focusing
  mark A doesn't wipe mark B's tooltip; width-stamped and cleared on reflow), focusable
  thesis/arena marks with full aria-labels, session crosshair with a figcaption text twin (the
  SVG overlay is decorative - screen readers get the session values as real text), binding
  ρ ≈ +.44/+.65 footnote.
- `src/observatory/panels/WordRadar.tsx`: pure-trig 6-axis radar (0–5 norms), longest labels
  top/bottom + side labels clamped into bounds for 320 px legibility, two-word overlay (ink solid
  vs ink-muted dashed + distinct vertex shapes - no vermillion, no modality-trio colors),
  searchable pickers (shadcn Input + native buttons; always-mounted `role="status"` live region
  announcing result counts; focus returns to the input on select), `ARENA` badge + gloss for the
  17 matches, default pair from the pipeline.
- `src/observatory/Observatory.tsx`: container/presentational split (`ObservatoryView` is the
  test target), header strip (`RECORD · ALL PLAYERS` chip, register line, live Σ counts, static
  §10.6 wave rule), loading/error/empty states in the lab register, coming-soon slots (network /
  confusion, §2.3 honest pattern), attribution footer (thesis + McLean, Dunn & Dingemanse 2023 +
  Iida & Akita 2023).
- `src/App.tsx`: `AppView` gains `"observatory"`; header ghost Button; completion-panel
  "See where this session lands" passing session accuracy (player rating mean computed in the
  container via `getAllMyRatings()`; crosshair y omitted without it). No other game-surface touch.
- `src/styles/observatory.css` (all rules in `@layer app`, tokens only, zero transitions -
  reduced-motion holds by construction) + one `@import` in `app.css`; `tsconfig.app.json` gains
  `resolveJsonModule`; README gains an Observatory section + pnpm-form script list.

Proof:
- Static battery green at exit: `pnpm lint` · `pnpm build` · `pnpm vitest run` (153 - was 84;
  +69 across chart math, data integrity, and panel smokes incl. the empty-divergence deploy-day
  guard and the session text-twin assertion) · `node scripts/verify-presentation-logic.mjs` ·
  `node scripts/verify-token-purity.mjs`.
- Pipeline gates: run-twice idempotence (checksums identical); corrupt-CSV smoke → exit 1, all
  problems listed, nothing written.
- Live manual pass vs backend :8081 (divergence: 154 rows, Σ1012 guesses / Σ48 ratings - the
  local dev DB includes browser-loop test artifacts): both entry paths, tooltips by mouse hover
  AND touch tap (pointerdown - CDP tap synthesis never delivers `click` on SVG marks; pointer
  events are the durable fix), keyboard focus tooltips + Escape, table twins, picker
  search/select.
- Responsive: 1280 / 375 / 320 screenshots; zero horizontal overflow at every width; dumbbell
  short labels below 520 px; radar labels clamp unclipped at 320 px.
- `node scripts/verify-browser-loop.mjs` full pass, desktop exit 0 and 375 px exit 0 (game loop
  untouched - zero trial-surface files in the diff; the only game-surface touch is App.tsx view
  wiring).
- Adversarial multi-agent review over the full diff (6 lenses, 12 raw findings, 8 confirmed by
  adversarial verify + 3 verifier-timeout claims judged by hand, 1 rejected): all accepted
  findings fixed before exit - highest was the aria-hidden session crosshair lacking a text twin.

Result:
Complete. The Observatory ships all three v1.0 panels against live data with the vendored
reference layers and honest low-n/empty states throughout; tree clean for review. Flagged
spec interpretations (adjudicated or disclosed): scatter y = z within study (Nils's pick over
normalized/native axes); radar default pair kirakira/sukkiri (max-L1 over the actual 17-word
arena∩norms strict-equality intersection - kirakira/dokidoki ranked 2nd and was not pinned);
per-mark `aria-label` instead of `aria-describedby`; McLean backdrop non-focusable (its data
lives in the always-in-DOM table twin); radar axis display order re-slotted for 320 px label
fit; dumbbell live means include practice traffic (`is_practice` is per-round, not per-word -
disclosed in the figcaption). Optional S1 wave-rule rider not attempted (time went to the
responsive/a11y/review passes); the plain §10.6 rule ships.

Commit:
Not committed (commits are the user's - expected).

Blocker:
None.

Next single task:
NIL-80 (Observatory v1.1: rainclouds + integrity strip + kana labels) - blocked on NIL-79's
endpoints (`rating-distributions`, `position-bias`, `displayForm` on DivergenceResponse).

---

## 2026-07-06 - NIL-81 (Observatory E1 figure-export pass)

Session goal:
Static poster-grade exports from the committed Observatory v1.0 (`ab04469`): og-image / social
card, landing strip art for the NIL-43 Observatory strip (art-left slot, V16), and 2–3 portfolio
figures (dumbbell + scatter) for the NIL-44 README. Assets only - no component edits.

Changed:
- `docs/design/observatory-figures/generate-figures.mjs` - data-driven SVG generator; reads the
  vendored `src/data/observatory/*.json` (the same files the live panels read), emits four figure
  SVGs on the UI-SYSTEM §4.1 token palette.
- `docs/design/observatory-figures/svg/{og-image,observatory-strip,observatory-dumbbell,
  observatory-scatter}.svg` - sources.
- `public/og-image.png` (1200×630, social card), `public/observatory-strip.png` (1600×1200, 4:3,
  NIL-43 strip art).
- `docs/design/observatory-figures/observatory-{dumbbell,scatter,radar}.png` (portfolio),
  `contact-sheet.png`, `README.md`. Full set mirrored to planning `docs/design/observatory-exports/`.
- **Radar** (3rd portfolio figure, added after the brand-font pass): faithful to `WordRadar.tsx`
  - six perceptual axes, kirakira vs sukkiri from the Iida & Akita norms, ink solid vs ink-muted
  dashed, chips carry verified canonical kana. **og redesigned** as a kana specimen plate
  (キラキラ hero) replacing the mini-scatter - stronger brand identity for a social card.
- **Kana**: the vendored/source data is romaji-only, so canonical kana was lifted verbatim from
  the backend seed (`ideophone-arena-api` `db/init/ideophone_arena.sql`, `canonical_form`) - never
  transliterated (script is the thesis's own variable, invariant 1). LINE Seed JP `japanese`
  subset installed for kana glyphs.
- Pre-flight (SPEC-stats-dashboard re-copy from the planning folder): NOT needed - repo copy and
  planning copy are byte-identical (both 205 lines); the 204/205 concern was already reconciled.

Proof:
- Every mark reads real vendored data - dumbbell = thesis modality means (68.6/64.2/59.7%, N=360
  each); scatter = McLean 2023's 304 items + 30 thesis pairs. No invented numbers. No live arena
  layer exists in a static export, so **no data mark is vermillion** (grep: the only `#c8401f` in
  each chart SVG is the §10.6 wave-rule polyline).
- Divergence framing verbatim ("the two measures see different things", never "orthogonal").
- Attribution string-matches the Observatory footer (`Observatory.tsx`) - verified in-script that
  the footer contains ATTR_THESIS and ATTR_MCLEAN, and the scatter panel contains the divergence
  line (all true). V17 credit list honored.
- `pnpm lint` clean; `pnpm build` green (786ms); `public/*.png` copied into `dist/`. Assets-only -
  no `src/` touched. Rendered contact sheet reviewed at target sizes; og is legible at thumbnail.

Result:
Complete. Four assets delivered. D5 (which export fills strip 6) resolved to the **scatter** as
primary strip art at 4:3, with the dumbbell portfolio figure as the ready alternative for Nils's
eye - either lifts the V16 binding fallback. Typography: figures render in the **brand faces**
(Zen Maru Gothic display + LINE Seed JP body/labels, matching `tokens.css` and the shipped
Observatory panels), installed to fontconfig from the vendored `@fontsource` WOFF1 subsets via
`woff2sfn` (AUR woff-tools) + Noto CJK for symbol fallback - set up mid-session after the tooling
landed (README documents the exact steps). Rendering path: native `rsvg-convert` (WSL interop is
disabled in this shell, so headless Edge was unavailable - rsvg is more deterministic anyway).
Canvas-design skill consulted for craft; algorithmic-art deliberately held for NIL-82 (N2) per
the NIL-71 stage split.

Commit:
Not committed (commits are the user's). Stage the NIL-81 paths ONLY:
`public/og-image.png public/observatory-strip.png docs/design/observatory-figures/`. Two spec files
(`SPEC-free-form-entry.md`, `SPEC-view-designs.md`) are modified in the tree by a concurrent NIL-83
session (Fable, 22:51–22:53) - NOT part of this session; leave them for NIL-83's own commit.

Blocker:
None.

Next single task:
Per running order v3 - N2 = NIL-82 (Observatory generative/algorithmic-art pass, `algorithmic-art`
skill). NIL-43 can now lift the V16 fallback and drop `public/observatory-strip.png` into strip 6.

## 2026-07-07 - NIL-43 (public landing page - the eight-strip composition)

Session goal:
Build the public landing (SPEC-view-designs §3 + V15–V19; mockup
`view-adjudication-mockups/landing-composition.html`) as an in-app React view, wired into the
hand-rolled view state machine, and open the app's first public front door. Resolve the deferred
decisions with Nils first.

Decisions (Nils, this session):
- D1 = public deep-link - the Observatory is now a second public surface; strip-6 CTA opens it
  logged-out (its `/api/research/divergence` is already `permitAll`).
- D5 = scatter - E1 art = `public/observatory-strip.png` (NIL-81 export), behind an `onError`
  fallback so the V16 wave placeholder still renders if the asset is ever absent.
- D4 = link the thesis - "(Paulsson, SPVR01)" links to the LUP record
  `https://lup.lub.lu.se/student-papers/record/9214474` (external; no file hosted). Nils supplied
  the URL mid-session.
- Perception Ladder = coming-soon (honest, §2.3/§9), not the mockup's optimistic live card - the
  mode is unbuilt, so a live button would dead-end.
- Attribution: Winter et al. dropped so the credit set string-matches the Observatory footer
  (`Observatory.tsx` - V17 / §7). ρ ≈ +.44/+.65 stay in the strip-4 footnote framed as McLean 2023
  cross-scale correlations, not thesis numbers.

Changed:
- `src/components/Landing.tsx` (NEW) - the eight strips: hero (adopted copy + L5 wave rule + L4
  ガタン practice-kana specimen) · numbers (three raised-FILL stat cards, no shadow) · how-it-works
  + honesty line · dissociation (binding "Ratings detect ideophone-ness; guessing doesn't") · Script
  Lab teaser (framing rule) · Observatory (art-left/copy-right, E1 scatter + `onError` fallback,
  ghost CTA) · six-mode grid (2 live buttons / 4 honest coming-soon articles; XL title placeholder)
  · provenance footer (thesis LUP link, citations, CC BY line). CTAs are the shadcn `Button` only.
- `src/styles/landing.css` (NEW) - bespoke strips scoped under `.landing` in `@layer app`, tokens
  only (no hex), imported by `app.css`. `.landing-mode-card` is distinct from the ModeSelect
  `mode-card` pinned hook. Renders full-bleed OUTSIDE `.site-main` (App shell), so no `100vw`
  breakout and no scrollbar overflow.
- `src/App.tsx` - new `"landing"` AppView; logged-out initial view = landing; `pendingMode` +
  `authInitialMode` state; `handleAuthenticated` applies the promised mode post-auth (hero →
  Meaning Match instructions); `handleLandingPlay` / `handleVisitObservatory` / `handleLoginClick`;
  header "Log in" (public) + wordmark → landing; landing + (public) Observatory now precede the auth
  gate; landing rendered full-bleed.
- `src/components/AuthForm.tsx` - `initialMode` prop (register tab default on the hero path).
- `scripts/verify-browser-loop.mjs` - entry rewritten to the new front door: land on landing →
  assert strip-7 grid honesty + no horizontal overflow → hero "Prove it" → register (register tab
  is the hero default) → Meaning Match instructions (the §7 hero waypoint) → "Back to modes" →
  ModeSelect grid (preserved) → play. Remaining game/rating waypoints unchanged.

Proof:
- `pnpm lint` clean · `pnpm build` green (tsc + vite) · `pnpm test` 153/153 · `verify-token-purity`
  and `verify-presentation-logic` pass.
- `verify-browser-loop.mjs` exit 0 at BOTH desktop (1280) and 375px (headless Chromium on Linux via
  CDP 9224 - Windows-Edge interop is disabled in this shell, so the Playwright-cached Chromium was
  driven instead; same CDP contract). Each run: 32 answered rounds, 2 practice, completion +
  leaderboard + recent attempts + rating reveal, `staleControlCount` 0, `mutedStimulusCount` 0,
  `relevantConsoleErrorCount` 0; 375px `overflowProof` scrollWidth == innerWidth.
- Full-page landing screenshots at 1280 and 375: 8 strips, single `<h1>`, no horizontal overflow
  (1280→1265/1280; 375→375/375), E1 scatter loaded, 2 live + 4 coming-soon cards, thesis link →
  LUP record. Mobile stacks with the motif first (order:-1).

Result:
Complete and green. The app now opens on a public landing for logged-out visitors; the Observatory
is publicly reachable (D1). ModeSelect keeps its browser-loop coverage via the "Back to modes"
detour. `.AGENTS.frontend.md` punch list, README, and the frontend-grading-checklist updated for the
new public boundary.

Commit:
Not committed (commits are the user's). Stage NIL-43 paths: `src/components/Landing.tsx`,
`src/styles/landing.css`, `src/styles/app.css`, `src/App.tsx`, `src/components/AuthForm.tsx`,
`scripts/verify-browser-loop.mjs`, `AGENTS.md`, `README.md`, `docs/frontend-grading-checklist.md`,
`docs/progress-log.md`. Leave the concurrent NIL-83 spec edits
(`SPEC-free-form-entry.md`, `SPEC-view-designs.md`) for that session.

Blocker:
None. (Windows-Edge CDP is unavailable in this shell; verified with Linux headless Chromium on the
same CDP endpoint instead - noted so the next run knows both paths work.)

Next single task:
NIL-63 per-card replay affordance is shipped; the open landing-adjacent follow-ups are the D3 XL
mode-name pair (Lingua Quest / Polyglot Challenge) and game-loop polish. Landing is otherwise done.

## 2026-07-07 - NIL-80 (Observatory v1.1 - rating rainclouds + integrity strip + kana labels)

Session goal:
Consume the NIL-79 endpoints to finish the Observatory: a per-modality rating-raincloud panel, an
SDT position-bias "integrity strip", and verbatim kana on the scatter + radar from the new
`displayForm` field. Frozen shapes = the api repo's `docs/backend-contract.md` (NIL-79).

Decisions (Nils, this session):
- Thesis rainclouds reference data: the participant-level `gorilla-tidy-rating.csv` is already
  git-tracked at `docs/research/data/`; **read it in place** (build aggregates it to the committed
  `thesis-ratings.json`, counts only). The privacy question (participant IDs in the repo, vs SPEC
  §4.6) is knowingly **deferred** to a separate task.
- Kana source: thread a `romaji→displayForm` map from live `/divergence` into both the scatter and
  the radar; a word wears kana once it enters the record, romaji until then (invariant 1: rendered,
  never derived).
- Thesis citation standardized to **Paulsson (2025)**, full title *Unimodal and Cross-Modal
  Iconicity in Japanese Ideophones: A Cognitive-Semiotic Approach* - the prior "(2026)" is retired
  across footer, landing, and dataset meta.

Changed:
- New panels `src/observatory/panels/{RatingRainclouds,IntegrityStrip}.tsx` (+ tests); new pure
  primitives `src/observatory/chart/{jitter,rainclouds}.ts` (+ tests); `format.ts` gained
  `formatFixed2`.
- `src/api/{types,client}.ts`: `displayForm?` on `DivergenceEntry`; `RatingDistributionsResponse` +
  `PositionBiasResponse` types; `getRatingDistributions()` + `getPositionBias()` (+ client tests).
- `Observatory.tsx`: two new independent-degrade fetches, `RatingDistributionsState` /
  `PositionBiasState`, the `kanaByRomaji` map, and the two panels inserted after the radar
  (arc: dumbbell → scatter → radar → rainclouds → integrity → coming-soon; both coming-soon slots
  kept). Kana threaded into `DivergenceScatter` (arena + thesis marks, tooltip/table, `lang="ja"`)
  and `WordRadar` (ARENA chips). `aggregate.ts` carries `displayForm` on arena points.
- Data pipeline: `build-observatory-data.mjs` optionally reads the tracked gorilla CSV → committed
  `src/data/observatory/thesis-ratings.json` (per-modality 1–7 counts, n=360×3=1080); `types.ts` +
  `index.ts` + `data.test.ts` updated. `observatory.css`: raincloud + integrity + kana classes
  (tokens only, zero transitions).

Proof:
- `pnpm lint` clean · `pnpm build` green (tsc + vite) · `pnpm vitest run` **197/197** (was 153) ·
  `verify-token-purity` and `verify-presentation-logic` pass · `build-observatory-data.mjs` rerun
  leaves the four prior JSONs byte-identical (deterministic).
- Live backend (`localhost:8081`, dev DB): the three endpoints' keys match the TS types exactly
  (incl. `@JsonProperty`-pinned `dPrime` and all nullable fields); with no play data yet,
  `position-bias` = `{n:0, …nulls}` and `rating-distributions` = `{distributions:[], byModalityN:{}}`
  - exactly the empty-state fixtures the panels handle.
- Real-browser pass (Linux headless Chromium via CDP 9224 - WSL interop can't exec Windows Edge):
  the Observatory renders all five panels (`dumbbell,scatter,radar,rainclouds,integrity`) with the
  thesis raincloud silhouettes + "Awaiting the first rating", the integrity 50% hairline + em-dashes
  + "Awaiting the first scored round", both coming-soon slots, and the corrected Paulsson (2025)
  footer. No horizontal overflow at 1280 (scrollWidth 1265 ≤ 1280) or 375 (375 == 375). Screenshots
  captured. (Populated-panel rendering is covered by the unit tests with contract-shaped fixtures;
  live kana wasn't visible because the dev DB has no play data.)

Result:
Complete and green - five live panels + the integrity strip. Tree left uncommitted for review.
Dev backend + Vite left running for a manual populated pass if wanted.

Commit:
Not committed (commits are the user's). Suggested message:
"add Observatory v1.1: rating rainclouds, integrity strip, and kana labels". Stage: `src/api/*`,
`src/observatory/**`, `src/data/observatory/{types,index,data.test}.ts` + `thesis-ratings.json`,
`src/components/Landing.tsx` (citation), `scripts/build-observatory-data.mjs`,
`src/styles/observatory.css`, `docs/progress-log.md`.

Blocker:
None for the build. Deferred (Nils's call): participant-level `docs/research/data/gorilla-tidy-*.csv`
remain git-tracked - a future task should untrack + gitignore them (history rewrite for a full purge).

Next single task:
Manual populated-data pass against the live Observatory (play a few scored rounds + ratings so the
rainclouds/integrity/kana render with real numbers), or NIL-84 essence review per running order v3.

## 2026-07-08 - NIL-42 / 28B (Perception Ladder UI)

Session goal:
Build the Perception Ladder AppView per SPEC-view-designs §1 + V1–V9 and the ladder-floors.html
mockup: a vertical washi floor stack, a floor-intro dialog, an in-run chrome frame above the
untouched trial board, floor completion, and summit - against the already-landed 28A backend
(`GET /api/game/ladder/floors`, LADDER session mode). Plus the 28B riders (A3 difficultyLevel
sweep, D2 font cut, §6 CSV untrack, landing Polyglot rename).

Decisions (Nils, this session):
- Ladder presentation = a condition picker in the floor-intro dialog (reuses
  `SCRIPT_LAB_CONDITION_OPTIONS`, default audio-only), superseding the earlier "fixed audio-only".
- A3 = full difficultyLevel sweep (removed everywhere incl. Instructions copy + test fixtures).
- Perception Ladder promoted to a live landing card (moved out of "In the works").
- Touch ships now as a real 4-pair floor (ADDENDUM decision a); the V8 teaser survives only as a
  client-side graceful-degradation path (fixture-proven), removed when the API serves HAPTIC.

Changed:
- New: `src/components/PerceptionLadder.tsx` (+ `.test.tsx`), `src/ladderText.ts` (floor model +
  draft copy + pure `deriveFloorRows`), `src/styles/ladder.css` (imported in `app.css`).
- API: `src/api/types.ts` (Ladder DTOs, `GameMode`, `Modality += HAPTIC`, `StartSessionRequest`
  gains `gameMode`/`floor` and drops `difficultyLevel`, response types cleaned), `src/api/client.ts`
  (`getLadderFloors`). `src/roundValidation.ts` now owns the shared round/completion predicates
  (extracted from `App.tsx`). `src/researchFlavor.ts` gains the HAPTIC case.
- Wiring: `src/App.tsx` (`ladder` AppView + handleModeSelect + renderMain; difficultyLevel echo
  removed), `src/modes.ts` (ladder → available), `src/components/Landing.tsx` (Perception Ladder →
  LIVE_MODES; "Cross-Linguistic" → "Polyglot Challenge").
- A3 sweep: `src/components/Instructions.tsx` (prop + "Difficulty stays fixed at 1" copy) + 5 test
  fixtures; guard tests updated (`modes.test.ts`, `ModeSelect.test.tsx`).
- D2: removed `@fontsource/zen-kaku-gothic-new` (package.json + `src/main.tsx` + `tokens.css`
  `--font-body` + dev styleguide refs).
- §6: `git rm --cached docs/research/data/gorilla-tidy-{choosing,rating}.csv` (already gitignored;
  choosing.csv has zero consumers, the observatory build tolerates rating.csv absence).
- Proof: `scripts/verify-browser-loop.mjs` gains `verifyPerceptionLadder` (floor stack → floor-intro
  Dialog §16 H7 idiom → play a floor → completion). Docs: `backend-contract.md` (ladder endpoint +
  LADDER session start + leaderboard exclusion; difficultyLevel removed), `frontend-grading-checklist.md`,
  `README.md`.

Proof:
- `pnpm lint` clean; `pnpm build` (tsc -b + vite) green; `pnpm vitest run` 204/204 (7 new ladder
  fixture tests: 3-floor→3+teaser, 4-floor→4 no-teaser/teaser-removal flag, ordinals from array,
  sequential-unlock pills, thesis-mean stats, semantic-hook first-position, haptic label-pairing).
- `node scripts/verify-presentation-logic.mjs` and `node scripts/verify-token-purity.mjs` both green
  (trial-board invariants, forbidden-kana scan, motion gate, token purity of the new `ladder.css`).
- `node --check scripts/verify-browser-loop.mjs` passes.

Result:
Static + unit + verify battery fully green. The ladder path is wired end to end and the browser-loop
idiom is shipped. The LIVE browser loop and screenshots were NOT run this session - see Blocker.

Commit:
Not committed (commits are the user's). Suggested message:
"add Perception Ladder UI (NIL-42/28B) + A3 difficultyLevel sweep + D2 font cut". Stage: `src/**`,
`scripts/verify-browser-loop.mjs`, `package.json`, `pnpm-lock.yaml`, `docs/{backend-contract,
frontend-grading-checklist,progress-log}.md`, `README.md`, and the `git rm --cached` of the two
`docs/research/data/gorilla-tidy-*.csv`.

Blocker:
Live browser proof pending infrastructure: the backend (:8081), Vite dev server (:5174), and CDP
endpoint (:9224) were all down this session, so `node scripts/verify-browser-loop.mjs` (desktop +
375px) and the five ladder screenshots (stack, floor-intro dialog, in-run + final rung, floor
completion, summit) could not be captured. To run: start the API, `pnpm dev`, launch Edge/Chromium
on :9224, then `node scripts/verify-browser-loop.mjs http://127.0.0.1:5174/ http://127.0.0.1:9224/json/version`
and again with a `375` fourth arg.
Copy note: the live Touch-floor description + benchmark line in `ladderText.ts` are NEW draft copy
(the spec only drew a teaser) and await Nils's veto.

Next single task:
Run the browser loop (desktop + 375px) against the live stack, capture the five ladder screenshots,
and adjudicate the live Touch-floor copy.

## 2026-07-08 - NIL-42 browser proof (the run left open at the build handoff)

Session goal:
Close the one task NIL-42 left open: a green live browser proof at both viewports plus the five
ladder screenshots. Run-only; no feature code unless the loop surfaces a real defect.

Result: PARTIAL - screenshots + static battery delivered; the automated green loop is BLOCKED by a
cross-repo backend guard (A10) that no 2026-07-08 session caught. Needs a Nils decision (below).

Changed (harness-only; the loop surfaced these as its own defects - no product/copy changes):
- `scripts/verify-browser-loop.mjs`, landing + home assertions: NIL-42 promoted Perception Ladder to
  a LIVE card, but the loop still asserted it "coming-soon" (4 stale assertions) and used the old
  "Cross-Linguistic" name. Fixed: landing coming-soon now Word Mint / Word Anatomy / Polyglot
  Challenge; landing + home live lists now include Perception Ladder; home grid asserted to have zero
  coming-soon stubs (all three MODES are `available`). VERIFIED LIVE - the loop now clears every
  landing + home assertion and stops only at the A10 register wall.
- `scripts/verify-browser-loop.mjs`, ladder assertions (lines ~1854, ~1912): `bodyText` is
  `innerText`, which reflects `ladder.css:28`'s `text-transform:uppercase` on `.ladder .specimen`, so
  "Floor 1 · Sound" / "Up next" / "Final rung" arrive UPPERCASED and the mixed-case `.includes`
  checks would fail. Made case-insensitive (same convention the loop already uses for other
  uppercased labels). INSPECTION-VERIFIED only - the loop can't reach the ladder until A10 is
  resolved, but my standalone driver hit and fixed the identical bug empirically. `clickText`
  (`textContent`, not transform-affected) was already fine.

Proof:
- Static battery GREEN on this tree: `pnpm lint` (0), `pnpm build` (tsc -b + vite, 0),
  `pnpm vitest run` 204/204, `node scripts/verify-presentation-logic.mjs` OK.
- Stack booted: backend :8081 (pristine seed - `GET /api/game/ladder/floors` → 4 real floors
  AUD/VIS/HAPTIC/INT in hierarchy order), Vite :5174, Edge CDP :9224.
- Five ladder screenshots × 2 viewports (desktop + 375px) captured via a data-safe manual driver
  (`scratchpad/ladder-shots.mjs`): a NORMAL non-reserved user playing ONLY the ladder - ladder
  answers are `gameMode=LADDER`, already fenced from the frozen CHOOSING aggregates + leaderboard by
  design, so no policy decision is needed just to screenshot. Floor 1 (Sound) was played to
  completion through the real audio-gated trial board (foreground-activation poller kept Web-Audio
  timers unthrottled); summit reached by clearing the remaining floors via the LADDER API.
  Visually verified: floor stack (V2/V3/V4 tinted labels + pill states), floor-intro Dialog + V9
  condition picker, in-run chrome over the untouched trial board (invariant 4 A/B placeholder holds,
  no 375px overflow), floor completion (V7 benchmark "Floor mean in the thesis: 6.9/10. You: 3/10."),
  summit (per-floor benchmark grammar + cleared pills; Touch shows the "norming study" line).
  Paths (scratchpad, ephemeral): `shots/{1-floor-stack,2-floor-intro,3-in-run,4-floor-complete,
  5-summit}-{desktop,375px}.png`.

Blocker (needs a Nils decision - cross-repo, do not guess):
The sanctioned `verify-browser-loop.mjs` cannot go green. It registers a throwaway `browser_loop_<ts>`
user (so its 47 real CHOOSING rounds are fenced out of the frozen research aggregates by the
`browser_loop_%` read-side LIKE fences). Backend rider **A10** (uncommitted, shipped same day -
`ReservedUsernamePrefixValidator`, proof note "Registration of thesis_p37 → 400") now REJECTS
`browser_loop_*` and `thesis_p*` registration with 400. So the loop can no longer create its account,
and there is NO frontend-only fix: any non-reserved username the loop uses lands its CHOOSING
playthrough INSIDE the frozen aggregates - the exact pollution the `browser_loop_` scheme exists to
prevent. Resolution is the backend's (A10 exempts automation / an out-of-band seed path for reserved
prefixes / an alternate fence). Backend contract wins - surfaced, not guessed.

Copy note (unchanged, still Nils's veto): the live Touch-floor `description` + benchmark line in
`ladderText.ts` are NEW draft copy (spec only drew a teaser). Verbatim for adjudication:
  name: "Touch"
  description: "Texture and contact - prickly vs fluffy, sticky vs dry-smooth. No lab has baseline
    numbers for these, so you're the norming study."
  benchmark (thesisMean null): "No thesis baseline - you're the norming study. You: {n}/{total}."

Commit:
Not committed (commits are the user's). The only tree change vs the build handoff is the two
harness-correctness edits to `scripts/verify-browser-loop.mjs`.

Next single task:
Nils decides the A10 × browser-loop resolution (backend); then re-run
`node scripts/verify-browser-loop.mjs …` (desktop + 375px) for the sanctioned green loop, which will
also exercise the now-corrected ladder assertions.

## 2026-07-09 - NIL-62 (Word Mint frontend: ProductionLab)

Session goal:
Build `ProductionLab` - Word Mint's player surface - behind the mode shell: meaning prompt →
romaji input → one-shot submit → reveal (kana, similarity chips, score band) with the §7
motion-reveal choreography. Closes NIL-62 (the backend half landed at api `f22f663`).

Decisions (Nils, this session):
- **`{n}` gap → a small backend rider.** The frozen §8.4 status line is `WORD {i} OF {n} · YOUR
  MEAN {m}` and V14 forbids the client deriving or hardcoding the counts - but nothing served
  `{n}`. `/api/productions/next` returns one word; `/api/game/me/productions.totalElements` counts
  only the caller's own rows (that is `{i}` and `{m}`); `/api/research/triangulation` unions only
  words that already carry data. Ruled: serve `totalProducible` from the prompt endpoint.
- **`yours-line` ships trimmed:** `You minted <code>{input}</code>.` - the mockup's generated
  clause dropped. This is NEW player copy outside frozen §8 and needs a §8 amendment.
- **Reveal audio autoplays once** on reveal mount; the Replay pill re-triggers.

Changed (api, `-Dspring-boot.run.profiles=local,automation`):
- `ProductionRepository.countProducible(Collection<Modality>)`, wired through
  `ProductionService.getNextPrompt` → `ProductionMapper` → `ProductionPromptResponse`
  (`totalProducible` on BOTH the live prompt and the completed sentinel; caller-invariant, computed
  once per request). **Two things are load-bearing.** The *modality fence*: `Modality` has six
  values but `PROMPT_CYCLE` walks four, so `TACTILE`/`MOTION` words are not producible - an
  unfenced count would leave `{i}` forever one short of `{n}` the day one is trialed. `PROMPT_CYCLE`
  itself is passed in as the fence, so the two cannot drift. And keeping trial membership an
  `exists` subquery rather than a join: a word sits in many non-practice trials, and a join would
  count it once per trial. Tests + `docs/backend-contract.md` updated.

Changed (web):
- `src/components/ProductionLab.tsx` (new) + `src/styles/production.css` (new, scoped, tokens only)
  - **the first consumer of `--motion-reveal`** (essence-review D1; the token had zero consumers).
- `src/productionScore.ts` + `src/productionSubmit.ts` (new, pure) - score bands, chip-row
  membership, mirror-validation, and the submit-error classifier, so the one-shot promise and the
  chip rule are provable without a DOM (vitest runs in `node`).
- `src/experimentText.ts` - the frozen §8 slate, additive, split PREFIX/SUFFIX per the existing
  convention (no markdown renderer exists; none added). Authored **sentence case**, uppercased by
  CSS - §8 prints them uppercase because that is their *rendered* form (`.specimen`/`.mint-chip`
  are `text-transform: uppercase`, and the mockup DOM reads `Word 12 of 60 · your mean 58`).
- `src/api/{types,client}.ts` - production DTOs, `getNextProductionPrompt` / `submitProduction` /
  `getMyProductions` / `getAllMyProductions`, and `isUnparseableInput`. A 400 renders the frozen
  §8.1 helper - **never** the backend's `validationErrors.input` text, which is developer-facing.
- Mode wiring: `modes.ts` (`production`), `App.tsx` (AppView + branch), `Landing.tsx` (Word Mint
  `SOON_MODES` → `LIVE_MODES`), plus the loop's now-stale landing/home assertions in the same change.
- Proof battery: `ProductionLab` added to `verify-presentation-logic.mjs`'s compile list, client
  stub and a `productionStrings` verbatim block; `semanticHooks.test.tsx` pins the four `.mint-*`
  hooks; new `verifyWordMint` leg in `verify-browser-loop.mjs`.

Proof:
- `pnpm lint` clean · `pnpm build` green · `pnpm vitest run` **255/255** (was 219) ·
  `verify-presentation-logic` and `verify-token-purity` pass.
- api `./mvnw test` **168/168** (was 163 - the "163 tests" in the kickoff was right; the 155 in the
  NIL-62 changelog entry was the count at `f22f663`, before NIL-88/NIL-90 added tests).
- **`verify-browser-loop.mjs` exit 0 at BOTH desktop and 375px**, `assertionFailureCount: 0`,
  `relevantConsoleErrorCount: 0`, 375px `overflowProof` 393 == 393. Headless Chromium on Linux via
  CDP 9224 (Windows-Edge interop unavailable in this shell); backend booted `local,automation`, so
  `browser_loop_*` registration succeeded - **the A10 wall that blocked NIL-42's loop is gone**
  (NIL-88's exemption, live-verified).
- `wordMintProof`: `{statusLine: "Word 1 of 94", parseErrorSurvived: true, displayForm: "ごそごそ",
  similarityScore: 70, chipCount: 4, matchedChips: 2, unmatchedChips: 2, tableRows: 7}`.
  - The **one-shot promise is proven the only way that cannot lie**: type `ngrk` (passes the client
    mirror, so it reaches the server, which cannot segment it into morae → 400), see the frozen
    helper, then successfully mint **the same word**. Had the first attempt been recorded, the
    second would return 409 and no reveal would ever render.
  - The mint word is `pikapika`, not `gorogoro`: the scorer does not distinguish `s` from `r`, so
    `gorogoro` matches all seven features of `gosogoso` and scores 100 with an all-matched chip row.
    `pikapika` scores 70 and splits the row 2/2, exercising **both** chip states in-browser.
  - Motion gate checked by negative control: ungating the reveal animation makes
    `verify-token-purity` fail (`production.css:140`), so the `prefers-reduced-motion` claim is
    verified, not vacuous.

Self-review (3 lenses, each finding adversarially verified; 2 of 3 candidates survived, both fixed):
- **The fence guard was a comment, not a test.** `ProductionServiceTests` mocks the repository, so
  the JPQL never ran, and `ProductionHttpTests` could not detect the fence's removal because the
  seed has zero TACTILE/MOTION rows. New `CountProducibleTests` (`@SpringBootTest @Transactional`,
  rolled back) inserts the rows the seed lacks. Both "load-bearing" clauses are now real regression
  guards, each checked by negative control: **removing the modality fence fails 2 tests**, and
  **swapping the `exists` subquery for a join fails the duplication test**. A third case pins
  practice-only words as non-producible (ADR-3). Fixture note: a pairing's *foil* is also a word in
  a non-practice trial, so foils are minted TACTILE - outside the cycle - which is itself one more
  demonstration that the fence bites.
- **Stale status message.** A playback error on the reveal (`StimulusPlayback onError` →
  `setStatusMessage`) survived "Next meaning" and rendered under the next, unrelated meaning.
  `applyPrompt` now clears it, so every fresh prompt starts clean.
- Refuted: the `!prompt?.ideophoneId` falsy guard cannot soft-lock on `ideophoneId === 0` - ids are
  IDENTITY from 1, and the only null case (the completion sentinel) is routed to `done` by
  `applyPrompt` before the guard is reached.
- The invariants lens (frozen strings, kana verbatim, V12 neutral rule, chip membership, a11y)
  found nothing.
- Both loop viewports re-run green after the two fixes.
- Screenshots both viewports: `/tmp/word-mint-{prompt,parse-error,reveal}-{desktop,375px}.png`.
  Composition matches `word-mint.html`: neutral top rule (never score-colored), tinted
  `MEANING · AUDITORY` chip, kana at `--text-kana-feedback` with `lang="ja"`, 2 matched + 2
  unmatched chips, collapsible 7-row table twin, full-width CTAs at 375px.

Result:
Word Mint is playable end-to-end behind the mode shell; entries persist; NIL-62 closes.

Deferred (stated, not silently dropped):
- **`getTriangulation` + the §2.4 completion benchmark** ("Arena mean producibility for these
  words: 54") and the per-modality breakdown: `ProductionEntry` carries no `modality`, and the
  benchmark line is unfrozen copy (§8.4: "no new strings needed beyond the above"). The completion
  panel ships on Rating Lab patterns with the overall mean only. §2.4 also says *three* tinted
  modality labels; the shipped cycle has **four** - spec drift to raise.
- **Table-twin parentheticals.** The mockup shows `Heavy onset · no (p) / yes (d)`, but the API
  returns booleans only; rendering `(p)`/`(d)` would mean deriving phonology client-side. Ships as
  `no` / `yes`.
- The battery cannot detect an uppercase regression (no leg inspects `text-transform`).

Copy note (needs Nils's ruling to become canon):
1. `MINT_YOURS_PREFIX`/`MINT_YOURS_SUFFIX` ("You minted `{input}`.") are outside frozen §8 -
   ruled in this session, pending a §8 amendment.
2. The score caption renders `{score} - {band}` verbatim, so the numeral appears twice (once as the
   large `.score-figure`, once inside the band sentence). §8.2 freezes the `{score} - ` prefix and
   §2.3.4 drafts exactly that rendering; the mockup's number-less caption is marked DRAFT and loses
   to §8. If the duplication is unwanted, §8.2 is what changes.
3. `LENGTH · {n} MORAE` interpolates *your* mora count (the chip row is your word's shape story;
   the table proves the arithmetic).

Commit:
Not committed (commits are the user's). Two repos are dirty: `ideophone-arena-api` (the
`totalProducible` rider) and `ideophone-arena-web` (everything else).

Next single task:
NIL-85.
