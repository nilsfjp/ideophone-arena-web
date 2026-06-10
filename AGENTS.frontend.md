# CLAUDE.md — ideophone-arena-web

## What this is
React frontend for **Ideophone Arena**, a gamified 2AFC ideophone experiment (MA thesis on
Japanese ideophones and script iconicity). The trial flow is a research instrument first and
a game second: presentation rules carry experimental meaning. The backend is authoritative
for auth, session/round identity, valid choices, correctness, storage, leaderboard, history.
The frontend owns view state, presentation sequence, wording, layout, and research flavor.

**Supersedes** the pre-June-2026 AGENTS.md. In particular, its "Presentation rules" section
(deriving visible script from `canonicalScript` + condition at runtime) is **dead** — that
design caused inverted script displays. `INSTRUCTIONS.md` is archived history; ignore it.
`docs/backend-contract.md` remains the API authority; `docs/game-mode-roadmap.md` is the
long-term vision (do not start unprompted).

## Required reading before code changes
`docs/backend-contract.md`, `docs/project_guidelines.md`, `docs/frontend-grading-checklist.md`,
`README.md`, `package.json`. If frontend and backend disagree, the backend contract wins — ask,
don't guess.

## Stack & environment
React 19 + TypeScript 6 + Vite 8, react-router-dom 7, plain CSS in `src/styles/app.css`
(no Tailwind, no state-management or UI libraries). Backend at `http://localhost:8081`;
Vite proxies `/api`, so `VITE_API_BASE_URL` may be empty locally. Frontend dev origin
`http://localhost:5174`. JWT in localStorage via `src/api/client.ts`. Stimuli served from
`/stimuli/**`; repo resolves media through symlinks
(`public/stimuli -> ../stimuli`, `stimuli/<file> -> stimuli/final-stimuli/final-sokuon/<file>`).
Dev in WSL: browsers for manual proof live under `/mnt/c/`.
Stale tripwires — never reintroduce: port `8080`, `/api/rounds/next`, `TEXT_ONLY` as selectable.

## Experiment invariants — DO NOT MODIFY without explicit user approval
1. **Instruction wording is frozen.** All participant-facing trial text lives in
   `src/experimentText.ts` (created in S2) and nowhere else. Never rephrase, "improve,"
   duplicate, or relocate these strings. Canonical strings (user-adjudicated, 2026-06-10):
   - "Listen to these two Japanese words."
   - "One of them means **{target}**" / "The other means **{other}**"
   - "Which one do you think means **{target}**?" — target stays bolded, no quotation
     marks; the only drift in current code is the missing question mark, which S2 adds.
   The archived AGENTS.md's "Which word…" phrasing is wrong; do not restore it.
2. **Trial phase order is fixed:** fixation → left plays → right plays → choice → feedback.
   Timing comes from the backend (`timing.fixationMs`, `timing.preChoiceDelayMs`).
   Never hardcode, reorder, or skip phases.
3. **Script display is received, never computed.** Render the backend's `displayForm`
   verbatim. Client-side kana conversion/detection is forbidden (S1 deletes the heuristics
   in `conditionPresentation.ts`; never reintroduce them).
4. **Audio-only condition shows neutral A/B placeholders pre-answer** — no script, no romaji.
   Reveal display form, romaji, and meaning only at feedback.
5. **No mid-trial layout shift.** All phase elements occupy reserved space at mount; phases
   toggle visibility, not document flow. (Mobile bug fix AND timing-validity requirement.)
6. Response time is measured from choice-phase start to selection; do not move the
   `performance.now()` anchors. Submit integers; prevent double submission.
7. During fixation/playback/choice, cards must not reveal identity beyond the intended
   channel: aria-labels are position-only ("Choose card A") until feedback.
8. Condition mapping (UI label → enum): Audio only → `CONDITION_1_SOKUON`,
   Script match → `CONDITION_2_SOKUON`, Script mismatch → `CONDITION_3_SOKUON`.
   `difficultyLevel` locked to 1. Never expose difficulty selection or numeric conditions.
9. **Framing rule for flavor text:** describe Script Lab as "presentation changes the
   experience," never as "matching script helps you guess" — the thesis found little
   group-level orthographic effect on accuracy. Research-note claims stay cautious.

## Player-facing wording
Use round / word / sound / card / ideophone / choice. Avoid stimulus / trial / condition /
subject in visible UI unless deliberately framed as science-logbook flavor. No dev-speak in
UI (kill "Presentation fallback", "React falls back to…"). Feedback must let a non-Japanese
reader identify, for both selected and correct answers: side (A/B), display form, romaji,
and meaning. Completion is a normal, persistent UI state; restart creates a fresh session.

## Verification & completion rule
Before any task is done: `npm run lint` and `npm run build` pass;
`node scripts/verify-presentation-logic.mjs` passes (S1/S2 extend it: frozen strings render
in their designated slots exactly once; `displayForm` rendered verbatim per condition;
phase order and reserved-layout rules hold); `node scripts/verify-browser-loop.mjs` for
loop-affecting changes. If CDP is unavailable, say so and provide manual browser proof
(narrow 360–390px viewport included) — do not route around it. A change is complete only
with: what changed / why / files / proof or exact blocker / next single task.
When API usage, ports, media behavior, or completion handling change, update
`docs/backend-contract.md`, `docs/frontend-grading-checklist.md`, `README.md`.

## Current punch list (June 2026)
- [ ] S1: delete kana-conversion heuristics; render backend `displayForm`; consume per-word
      audio assets instead of per-condition mp4s; add vitest (approved devDependency) for
      presentation mapping.
- [ ] S2: fix mid-trial layout shift via reserved-space rendering in `TrialPlayer`; extract
      frozen strings to `src/experimentText.ts` (adjudicate wording first); position-only
      trial aria-labels; remove dev-speak copy.
- [ ] Later: practice rounds (p-prefix stimuli); Modality Ladder / Rating Lab per
      `docs/game-mode-roadmap.md` (do not start unprompted).
