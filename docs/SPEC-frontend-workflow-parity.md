# SPEC — frontend workflow parity (logging + checklist)

Repo: `ideophone-arena-web`. Place at repo root or `docs/`. Docs/process only — NO app behavior change.

## Goal

Bring the frontend repo's session-logging and checklist workflow to parity with the backend, so
autonomous and manual sessions log identically going forward.

## Tasks

1. **Create `docs/progress-log.md`** using the backend's format exactly. Per entry:
   `## <date> (<session label>)` then the fields
   `Session goal:` / `Changed:` / `Proof:` / `Result:` / `Commit:` / `Blocker:` /
   `Next single task:`. Backfill terse entries for the four shipped frontend sessions (S1-S4) from
   the current punch list in `CLAUDE.md`/`AGENTS.md` so the log has continuity, then add THIS
   session as the latest entry.
2. **Reconcile `docs/frontend-grading-checklist.md`.** If it exists, bring it current with the
   shipped S1-S4 state and add dated evidence. If it is absent, create it mirroring the backend
   checklist's shape but scoped to what the frontend actually owns: verbatim `displayForm`
   rendering, frozen `experimentText.ts` strings, reserved-layout / no-mid-trial-shift,
   position-only aria-labels, condition mapping, the verify scripts as gates, and lint/build/test.
   It is NOT the course's Spring grading doc — keep it frontend-scoped.
3. **Update `CLAUDE.md`/`AGENTS.md` (frontend).** Add one concise line to "Verification &
   completion rule" (or "Required reading") mirroring the backend:
   "Append to `docs/progress-log.md` after each session (Session goal / Changed / Proof / Result /
   Commit / Blocker / Next single task)." Do not bloat the file.

## Constraints

- No source or behavior changes. Only `docs/` and the agent-instructions file.
- Do NOT touch `experimentText.ts`, `app.css`, `tokens.css`, `main.tsx`, or any component.
- Respect the frozen-strings and verbatim-render invariants (you are not editing them).

## Out of scope (flag as scope creep, do not do)

Any UI/feature work — game-loop polish, landing/welcome page, Modality Ladder, Rating Lab. Those
are separate, human-in-the-loop sessions. Stop and note it if drifting there.

## Verification (the oracle — proves no behavioral change; paste real output)

1. `npm run lint` -> green.
2. `npm run build` -> green.
3. `node scripts/verify-presentation-logic.mjs` -> green (proves frozen strings, verbatim render,
   and reserved-layout slots are untouched).
4. Show the three docs exist with the correct format.
   (No browser-loop run needed — no loop-affecting change.)

## Handoff

Clean working tree, NO commit, proposed commit message, next single task.
