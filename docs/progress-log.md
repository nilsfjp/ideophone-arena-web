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
to `src/experimentText.ts` (invariant 1) — the only home for that text. Trial
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
`node scripts/verify-browser-loop.mjs` (desktop and 375px) answered 32 rounds —
the first 2 as practice with no counter/score, progress held at 0% — then the
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
Docs/process only — bring the frontend repo's session-logging and checklist
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
`node scripts/verify-presentation-logic.mjs` green (oracle — proves frozen
strings, verbatim render, and reserved-layout slots are untouched, i.e. no
behavioral change). The three docs exist in the required format. No browser-loop
run needed — no loop-affecting change.

Result:
Complete. Frontend and backend now log session history in the same format and
maintain parallel grading checklists.

Commit:
Not committed (proposed message in the handoff).

Blocker:
None.

Next single task:
Game-loop polish (transition timing, feedback readability, mobile tap targets) —
a separate, human-in-the-loop session, out of scope for this docs-only run.

## 2026-06-28 (spec archival)

Session goal:
Docs-only cleanup — archive the now-implemented workflow-parity spec into
`docs/instruction-archive/`. No app, component, or style change. (Plus a
user-approved one-line eslint-ignore fix, below.)

Changed:

- `git mv docs/SPEC-frontend-workflow-parity.md
  docs/instruction-archive/SPEC-frontend-workflow-parity.md` (preserved, not
  deleted; rename keeps history).
- Updated the one inbound reference in this log's 2026-06-20 entry to point at the
  archived path.
- `eslint.config.js`: added `ds-bundle` to `globalIgnores` (was only `dist`).
  Lint was scanning `ds-bundle/_ds_bundle.js` — a gitignored, untracked local
  design-system build artifact that inline-disables `jsx-a11y`/`react-hooks`
  rules this flat config doesn't register, producing 3 "rule not found" errors
  unrelated to any committed source. User approved this config-only fix.
- Touched no participant-facing or behavioral code: `experimentText.ts`,
  `app.css`, `tokens.css`, `main.tsx`, and all components are untouched.

Proof:
`npm run lint` green; `npm run build` green; `npx tsc --noEmit` green;
`npm test` green (35/35); `node scripts/verify-presentation-logic.mjs` green
(oracle — frozen strings, verbatim render, and reserved-layout slots untouched).
Tripwire scan clean: no port `8080`, no `/api/rounds/next` (the live endpoint is
`/api/game/sessions/{uuid}/rounds/next`, matching the contract), `TEXT_ONLY`
present only in a test asserting it resolves to `unknown`.

Result:
Complete. Implemented spec archived; lint restored to green; no behavioral change.

Commit:
Not committed (proposed message in the handoff).

Blocker:
None. (Noted for later, not addressed here: `npm audit` flags 2 vite advisories
— 1 high/1 low, dev-server `server.fs.deny` bypass on Windows alt paths; and the
untracked 21M `ds-bundle/` local artifact carries a `_ds_needs_recompile` flag.)

Next single task:
Game-loop polish (transition timing, feedback readability, mobile tap targets) —
a separate, human-in-the-loop session.

## 2026-07-02 (27C — mode shell + game-loop polish, NIL-38)

Session goal:
Multi-mode shell (home/mode-select surface, view-state only, no router) so 27D
(Rating Lab) and 28B (Modality Ladder) can slot in, plus feedback-card and
instructions polish — tokens only, all participant-facing wording unchanged.

Changed:
- `src/modes.ts` (new): data-only mode registry (`choosing` available;
  `rating`/`ladder` coming-soon). Future modes flip `status` here and add a
  view branch in App — ModeSelect never changes.
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
  raised surface — CSS only, JSX untouched); instructions density pass
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
desktop AND 375px (exit 0 both; stale backend jar rebuilt first — it predated
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
27D — Rating Lab UI (NIL-39): flip `rating` in `src/modes.ts`, add the rating
view branch; backend ready (`GET /api/game/me/ratings` paginated → `.entries`,
public `GET /api/research/divergence`).

## 2026-07-02 (27D — Rating Lab wired to the API, NIL-39)

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
- New `src/ratingPool.ts` + test: contamination-free word pool — words enter
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
  intermittently miss under 375px mobile emulation — page scroll/reflow
  between measurement and dispatch); reveal matched case-insensitively
  (CSS-uppercased label).
- Docs: `docs/backend-contract.md` gained the previously-missing Ratings +
  Research divergence sections (409-not-upsert, null zero-n semantics);
  README mode-select/Rating Lab; grading checklist Rating Lab block.

Proof:
`npm run lint` / `npm run build` / `npm test` (85 tests, 14 files) green;
`node scripts/verify-presentation-logic.mjs` green;
`node scripts/verify-browser-loop.mjs` desktop AND 375px exit 0 — both runs
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
28B Modality Ladder per roadmap — user's pick.

## 2026-07-03 ("27E: meaning lines follow the seed draw + API-sourced rating pool (NIL-40)")

Session goal:
Consume server truth instead of client-side derivation, closing W27: (a) order the trial's two meaning lines by the
round's seed-drawn `targetMeaningListedFirst` (new on the round DTO); (b) retire the username-scoped localStorage
rating pool and source the Rating Lab pool from the new `GET /api/game/me/ratable-words` — the localStorage pool
broke for any multi-device hosted user (W30 blocker).

Changed:

- `src/api/types.ts`: `RoundResponse.targetMeaningListedFirst: boolean` (+ comment); new `RatableWordResponse` /
  `RatableWordPageResponse`. `src/api/client.ts`: `getRatableWords` + `getAllRatableWords` (page walker mirroring
  `getAllMyRatings`; shared cap renamed to `PAGE_WALK_MAX_PAGES`).
- `TrialPlayer.tsx`: the frozen line prefixes stay in place ("One of them means …" always first); the flag decides
  which gloss fills which line; a missing flag (older backend) keeps the historical target-first order. Question
  wording, left/right word placement, and kana rendering untouched; `experimentText.ts` untouched.
- `src/ratingPool.ts` is now a thin client: `RatingPoolWord` = the endpoint entry type, `fetchRatingPool()` walks
  the pages. localStorage read/write path and the `ideophone-arena-rating-pool` key deleted — discarded without
  migration (only pre-deploy test data existed).
- `RatingLab.tsx` fetches the pool itself (parallel with `getAllMyRatings`; same error/auth handling and retry);
  the `pool` prop is gone; instructions' already-rated count now comes from the ratings map; ratings POST without
  `sessionUuid` (server-pool words carry no provenance — the dead stale-session fallback helper was removed).
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
  (targetFirst 15 / otherFirst 17 — both orders exercised), refetch probe stable
  (`roundId` 91, flag `false`, twice identical); ratable-words requests observed (4, all 200),
  `ideophone-arena-rating-pool` key absent, instructions said 60 words = served pool 60; fresh-client parity:
  59 ids = browser pool minus the rated word, order stable across two fetches. 375px numbers: 32 rounds,
  targetFirst 20 / otherFirst 12, refetch stable, pool 60, legacy key absent, parity 59 ids exact.

Result:
Complete. Meaning-line order is now server truth end-to-end, and the Rating Lab pool follows the account instead of
the browser — the W30 multi-device blocker is cleared. NIL-40 exit criteria all met.

Commit:
Not committed (commits are the user's). Proposed message:
"order meaning lines by the round flag and source the rating pool from the API (NIL-40)" — body: TrialPlayer fills
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
the bespoke experiment surfaces on the same tokens, add the §11.3 guards, and carry the two named riders — all
presentation-layer, zero behavior change otherwise.

Changed:
- Wiring: `vite.config.ts` (@tailwindcss/vite plugin). `tokens.css` rewritten hex→`oklch()` with hex provenance
  comments (all round-trip byte-identical; verified), plus the new token groups — §3.2 `--text-prompt/-question`,
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
  — hand-authored Tailwind-v4 style, themed via the bridge, motion `motion-safe:`-gated, vermillion outline focus
  (§6), inline Lucide SVG paths (no icon dep), no tw-animate-css.
- Chrome → shadcn: AuthForm (Tabs/Input/Button), Leaderboard (Table + Button pager), completion actions/score-view
  switcher (Button + Tabs), logout (ghost Button), Instructions Start/Sound-check/Back (Button); `<Toaster/>`
  mounted (themed, staged — no triggers wired). Dialog staged (unused this session).
- Bespoke deltas in `app.css`: §1 surface grammar (complete/error panels → washi+border, no shadow;
  rating-reveal gains `--shadow-card`; condition options rest→washi + hover-lift); §3.2 prompt/question tokens
  (media-query font literals removed, clamps subsume them); §7 motion gated (progress-track transition +
  interactive-surface transitions all `prefers-reduced-motion: no-preference`); §2.1 container tokens; §2.3
  six-mode shell (auto-fill grid, measure chip, reserved status slot). Reserved-slot constants (§2.4) byte-unchanged.
- Rename sweep (§10.2, chrome literals only): `modes.ts` (Meaning Match / Rating Lab / Perception Ladder + measure
  chips), `Instructions` h1, `RatingLab` "Choosing Task"→"Meaning Match" (4 player-facing spots). Internal ids /
  API values / frozen `experimentText.ts` untouched. `verify-browser-loop.mjs` mode-name assertions updated to
  the adopted slate (required — the loop asserts those literals).
- Riders: (a) `labRecord.ts` word-meta cache (`rememberWordMeta`/`readWordMeta` + 4th `fallbackMeta` param on
  `buildLabRecordRows`) so a word rated in an earlier visit still shows romaji/gloss when divergence fails and it
  has left the pool; wired in `RatingLab`. (b) `lang="ja"` on the kana display elements (StimulusDisplay
  `.script-display-text`, FeedbackPanel `.feedback-display-form`) — attribute only.
- Test repairs (§11.2): FeedbackPanel/StimulusDisplay/TrialPlayer/Leaderboard/Instructions component tests +
  `verify-presentation-logic.mjs` moved from exact-markup to hook/prefix/attribute idioms; the shadcn Button's
  `disabled:` utility classes forced the disabled checks to assert the `disabled=""` attribute. New guards:
  `src/semanticHooks.test.tsx` (stable-hook contract) and `scripts/verify-token-purity.mjs` (hex + motion-gate).
- Deviations (browser-loop compatibility, consistent with each other): Instructions practice toggle stays a native
  `input[type=checkbox]` (Radix Checkbox has no `input`, which the loop queries); AuthForm inputs stay descendants
  of native `<label>` (loop associates by wrapping); mode cards stay `<button class="mode-card">`. The auth/
  completion Tabs ARE shadcn Radix — the loop's two tab activations were switched from `element.click()` to
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
follow-up per the spec — NOT run this session.

Commit:
Not committed (commits are the user's — expected). Uncommitted tree: 22 modified + untracked `src/components/ui/`,
`src/lib/`, `src/styles/{theme,shadcn-bridge}.css`, `src/semanticHooks.test.tsx`, `scripts/verify-token-purity.mjs`,
`pnpm-lock.yaml`, plus the pre-existing doc additions (`docs/specs/UI-SYSTEM.md`, `docs/design/`).

Blocker:
None.

Next single task:
NIL-63 per-card replay build per `UI-SYSTEM.md` §8 (icon replay button in `IdeophoneCard`, `--motion-spin`, kana-
measure guard, browser-loop replay waypoint), on this Tailwind/shadcn foundation.
