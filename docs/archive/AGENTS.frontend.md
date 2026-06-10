# AGENTS.md - Ideophone Arena Web

## Repository role

This repository is the React/Vite/TypeScript frontend for Ideophone Arena.

The frontend is the playable research-game interface for a Spring Boot-backed web app inspired by Japanese ideophones, script presentation, and cross-modal iconicity.

The frontend must preserve the working backend-driven MVP loop: register, login, start session, play ideophone rounds, submit answers, see feedback, complete a session, and view leaderboard or recent attempts.

The frontend is now also allowed to improve game feel, visual identity, mobile usability, research flavor, and Script Lab presentation, as long as the backend remains authoritative for authentication, session identity, valid choices, correctness, answer storage, leaderboard data, and recent-attempt data.

## Current project phase

Ideophone Arena has passed its MVP stabilization phase and is now in Phase 2 exploratory development.

The frontend still must preserve the working Spring Boot-backed game loop, but it is now allowed to improve game feel, visual identity, mobile usability, research flavor, and Script Lab presentation.

The frontend is no longer only a plain demo wrapper for the backend. It is the playable research-game interface for Ideophone Arena.

The backend remains authoritative for authentication, session identity, round identity, valid choices, correctness, answer storage, leaderboard data, and recent-attempt data.

The frontend may own:

- view state
- local loading/error state
- presentation sequence
- React-rendered visible stimulus presentation
- Script Lab selection among backend-supported conditions
- player-facing wording
- mobile/responsive layout
- research flavor text
- completion and dashboard layout

## Phase 2 guardrails

Exploratory frontend work is allowed when it preserves the full working MVP path.

Allowed Phase 2 work:

- improve mobile-first layout
- improve player-facing language
- replace laboratory wording such as "stimulus" with "word", "sound", "card", "ideophone", or "round"
- improve game feel and visual identity
- improve feedback so non-Japanese readers can understand what they selected
- improve research notes, as long as claims remain cautious
- refine Script Lab presentation
- use React as the source of visible script/placeholder presentation
- keep legacy `.mp4` assets as playback sources rather than visual authority
- add small vertical slices for future game modes after API contract review

Still avoid:

- broad rewrites without a vertical-slice goal
- frontend-only correctness or scoring
- arbitrary difficulty controls
- unsupported backend condition values
- `TEXT_ONLY` as a player-selectable mode
- large asset migrations without a separate asset-pipeline task
- new backend endpoint assumptions not documented in `docs/backend-contract.md`
- adding libraries before proving the current stack is insufficient

## Current Script Lab contract

The frontend may expose exactly these condition choices:

```text
Audio only      -> CONDITION_1_SOKUON
Script match    -> CONDITION_2_SOKUON
Script mismatch -> CONDITION_3_SOKUON
```

The frontend must keep:

```json
{
  "difficultyLevel": 1
}
```

Do not expose arbitrary difficulty selection.

Do not expose numeric condition values.

Do not expose `TEXT_ONLY`.

## Presentation rules

Do not let legacy `.mp4` video tracks define visible game presentation.

The preferred model is:

```text
StimulusPlayback  -> plays or preloads audio/media
StimulusDisplay   -> renders visible card/placeholder/script
conditionPresentation.ts -> maps backend condition enum to presentation behavior
```

The backend `kana` field alone is not display-script authority.

Visible script should be derived from:

- the ideophone data available from the backend
- `canonicalScript`
- current Script Lab condition
- pre-answer vs post-answer state

Audio-only:

- before answer: show neutral A/B placeholders
- after answer: reveal canonical display form, romaji, and meaning

Script match:

- before answer: render canonical script

Script mismatch:

- before answer: render the opposite script

Unknown condition or unknown script:

- use a safe fallback
- do not crash the round

## Player-facing wording

Avoid unnecessarily clinical laboratory wording in visible UI.

Prefer:

- round
- word
- sound
- ideophone
- card
- choice

Avoid in player-facing text unless deliberately framed as science/logbook flavor:

- stimulus
- trial
- condition
- subject
- response variable

The main question should be close to:

```text
Which word do you think means "<translation>"?
```

Feedback should help non-Japanese readers. It should identify:

- selected side A/B
- selected display form
- selected romaji
- selected meaning
- correct side A/B
- correct display form
- correct romaji
- correct meaning

## Mobile-first expectation

Treat mobile layout as important, not optional polish.

Responsive requirements:

- cards should stack cleanly on narrow screens
- answer targets should be touch-friendly
- progress should remain readable
- feedback should be readable without awkward scrolling where practical
- primary action buttons such as "Next round" should be centered and easy to tap

## Updated proof expectations

A frontend change is complete only with at least one relevant proof:

```text
npm run lint
npm run build
manual browser proof
node scripts/verify-browser-loop.mjs, if CDP is available
written blocker with exact error
```

If CDP is unavailable, do not route around approval limits. Report that CDP is unavailable and provide manual browser checks.

Manual checks for Script Lab/presentation work:

- Audio only starts and uses A/B placeholders before answer.
- Feedback reveals canonical script, romaji, and meaning.
- Script match starts and renders canonical script.
- Script mismatch starts and renders opposite script.
- No difficulty selector is visible.
- No `TEXT_ONLY` option is visible.
- Feedback remains readable.
- Progress updates.
- Mobile/narrow layout is not obviously broken.

## Required reading before code changes

Before changing implementation code, inspect these files:

```text
docs/project_guidelines.md
docs/backend-contract.md
docs/frontend-grading-checklist.md
README.md
package.json
```

Use `docs/backend-contract.md` as the API authority.

Use `docs/frontend-grading-checklist.md` as the browser/demo readiness checklist.

If backend behavior and frontend behavior differ, do not guess. Inspect the backend contract or ask for the current backend DTO/endpoint.

## Current local contract

Backend base URL:

```text
http://localhost:8081
```

Frontend development origin:

```text
http://localhost:5174
```

Frontend environment variable:

```text
VITE_API_BASE_URL=http://localhost:8081
```

Expected API contract:

```text
POST /api/auth/register
POST /api/auth/login

POST /api/game/sessions
GET  /api/game/sessions/{sessionUuid}/rounds/next
POST /api/game/sessions/{sessionUuid}/answers

GET  /api/leaderboard
GET  /api/game/me/attempts

GET  /stimuli/**
```

Protected requests require:

```text
Authorization: Bearer <token>
```

Do not reintroduce stale endpoint paths such as:

```text
/api/rounds/next
/api/rounds/{roundId}/answer
/api/me/attempts
```

unless `docs/backend-contract.md` has been intentionally changed.

Do not reintroduce stale backend port assumptions such as:

```text
http://localhost:8080
```

## Stack

Use the existing stack:

```text
React
Vite
TypeScript
CSS already present in the repo
```

## Current repository shape

Important current paths include:

```text
src/api/
src/components/
src/pages/
src/styles/
scripts/verify-browser-loop.mjs
public/stimuli
stimuli/
docs/
```

The repo contains large project resources and stimuli. Treat these as assets, not as code to reorganize casually.

Do not edit generated build output under:

```text
dist/
```

unless explicitly inspecting a production build.

Do not duplicate large media files unless the task is specifically about asset packaging.

The preferred contract is backend-served `/stimuli/**`. If the frontend also serves local stimuli for development, keep that behavior documented and do not make it contradict the backend contract.

## Core browser flow

The frontend must preserve this backend-driven flow:

1. Register or log in.
2. Store the JWT locally.
3. Send bearer token on protected API requests.
4. Select one supported Script Lab presentation mode.
5. Start a game session with `difficultyLevel: 1`.
6. Fetch the next round.
7. Show fixation.
8. Present left and right ideophone cards according to the selected presentation mode.
9. Show two answer choices.
10. Submit the selected ideophone.
11. Show backend-provided feedback.
12. Continue until completion.
13. Show a completion state.
14. Show leaderboard or recent attempts.

Supported Script Lab session requests:

```json
{
  "conditionName": "CONDITION_1_SOKUON",
  "difficultyLevel": 1
}
```

```json
{
  "conditionName": "CONDITION_2_SOKUON",
  "difficultyLevel": 1
}
```

```json
{
  "conditionName": "CONDITION_3_SOKUON",
  "difficultyLevel": 1
}
```

Do not expose arbitrary difficulty input.

Do not expose `TEXT_ONLY`.

Do not expose numeric condition values.

Do not add a new condition selector option unless the backend contract and backend tests prove that value is externally supported and seeded.

## API implementation rules

Centralize API calls in `src/api/`.

Centralize token handling.

Do not duplicate bearer-header construction across components.

Use TypeScript request and response types that match the backend DTOs.

Handle non-2xx responses visibly enough for demo use.

No failed request should leave the UI in an infinite spinner.

Do not build frontend-only game authority. The backend owns:

```text
session identity
round identity
valid choices
correctness
answer storage
leaderboard/history data
```

The frontend may own:

```text
view state
local loading state
local error display
local presentation sequence
session-local UI progress labels
```

If displayed totals are backend cumulative totals, label them honestly. Do not present all-time totals as session-local progress.

## Authentication rules

Registration and login must call backend endpoints.

JWT may be stored in `localStorage` for this course MVP.

On logout, clear token and authenticated state.

On `401`, clear invalid auth state or return the user to login.

Never display or store password data beyond the login/register request.

Do not include JWT secrets or database credentials in frontend code.

## Game-loop rules

The round flow should remain small and API-driven.

Expected presentation:

1. Fixation.
2. Left ideophone card.
3. Right ideophone card.
4. Both options visible.
5. User selects one option.
6. Submit answer to the backend.
7. Feedback appears and remains readable.
8. User explicitly continues to the next round.

Use “round” in player-facing UI. Avoid “trial” unless intentionally referring to the original experiment in documentation or science-flavored explanation.

Completion must be a normal UI state, not an error-looking crash.

The completion screen should remain visible until explicit restart.

Restart must create a fresh backend session.

Do not redesign the full app state machine unless explicitly requested. Prefer small vertical slices with proof.

## Error-handling minimum

The UI must show a visible state for:

```text
login failure
registration failure
missing/expired token
session-start failure
round-fetch failure
answer-submit failure
stimulus/media failure
session completion
empty leaderboard/history
```

Plain text errors are acceptable.

Polished error UX is not required.

Never hide failures behind endless loading.

## Development commands

From repository root:

```sh
npm install
```

```sh
npm run dev
```

Build proof:

```sh
npm run build
```

Lint proof, if available:

```sh
npm run lint
```

Browser proof target:

```text
http://localhost:5174
```

Automated/browser-loop helper, if applicable:

```sh
node scripts/verify-browser-loop.mjs
```

Since the current environment is WSL, browsers like Microsoft Edge and Firefox are located under `/mnt/c/`.

Inspect `package.json` before assuming script names.

## Manual browser proof

A frontend change is not complete until at least one relevant proof is recorded.

Preferred full proof:

```text
1. Start backend on http://localhost:8081.
2. Start frontend on http://localhost:5174.
3. Open http://localhost:5174.
4. Register a fresh user or log in.
5. Confirm Script Lab exposes exactly:
   - Audio only
   - Script match
   - Script mismatch
6. Confirm no difficulty selector is visible.
7. Confirm no TEXT_ONLY option is visible.
8. Start Audio only.
9. Confirm the request uses conditionName CONDITION_1_SOKUON and difficultyLevel 1.
10. Complete at least one full round.
11. Confirm answer feedback appears and remains readable.
12. Confirm feedback identifies selected and correct choices with side, display form, romaji, and meaning.
13. Restart or return to the start screen.
14. Start Script match.
15. Confirm the request uses conditionName CONDITION_2_SOKUON and difficultyLevel 1.
16. Confirm visible pre-answer script uses canonical script presentation.
17. Restart or return to the start screen.
18. Start Script mismatch.
19. Confirm the request uses conditionName CONDITION_3_SOKUON and difficultyLevel 1.
20. Confirm visible pre-answer script uses intentionally non-canonical/opposite script presentation.
21. Continue to completion if practical.
22. Confirm completion screen remains visible.
23. Confirm leaderboard or recent attempts are visible.
24. Check a narrow/mobile viewport and confirm cards, progress, feedback, and primary buttons remain usable.
```

Short proof for smaller changes:

```text
Open http://localhost:5174
Log in
Select one Script Lab mode
Start session
Submit answer
See readable feedback
Confirm progress updates
```

## Documentation rules

When endpoint paths, request/response shapes, ports, auth behavior, media behavior, or completion handling change, update:

```text
docs/backend-contract.md
docs/frontend-grading-checklist.md
README.md
```

Do not let docs drift back to:

```text
localhost:8080
/api/rounds/next
```

unless clearly marked as historical or old examples.

## Agent completion rule

A frontend change is not complete until the response includes:

1. What changed.
2. Why it was necessary.
3. What files were changed.
4. A proof command or browser proof.
5. Any backend dependency or blocker.
6. The next single task.

At least one of these must exist before claiming success:

```text
passing npm run build
passing npm run lint, if available
successful browser proof
successful verify-browser-loop script result
updated checklist item with evidence
commit hash
written blocker with exact error output
```

Do not claim a flow works without a browser proof or a clearly relevant automated proof.

## Current known risks to check first

Before broad work, verify:

```text
the running browser app is current source, not stale Vite state
backend URL is 8081
frontend URL is 5174
difficulty remains locked to 1
Script Lab exposes only the three supported condition labels
Script Lab sends backend enum strings, not numeric values
TEXT_ONLY is not visible or selectable
Audio only uses A/B placeholders before answer
Script match renders canonical script before answer
Script mismatch renders opposite script before answer
feedback is readable and useful to non-Japanese readers
progress labels are not misleading
completion screen stays visible
leaderboard/recent attempts are not cluttering active play
mobile/narrow layout is usable
```
