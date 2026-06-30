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
