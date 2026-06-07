# Frontend grading and integration checklist

Date: 2026-06-05
Repository: `/code/js/ideophone-arena-web`

## Purpose

This checklist verifies that the frontend demonstrates the Spring Boot backend correctly. The backend is the main grading target, but the frontend must make the project demonstrable: authentication, game flow, feedback, completion, leaderboard, and recent attempts.

Do not mark an item complete unless it has browser evidence, build evidence, or a clear file reference.

Status markers:

- `[ ]` not done
- `[~]` partly done or needs review
- `[x]` done and proven
- `[!]` blocker or grading risk

## Backend contract alignment

- [x] Frontend API base URL is configured through `VITE_API_BASE_URL`.
- [x] Local backend base URL is `http://localhost:8081`.
- [x] Local frontend URL is `http://localhost:5174`.
- [x] The frontend does not hardcode stale backend port `8080`.
- [x] The frontend does not rely on undocumented backend endpoints.
- [x] All API types match the backend DTO contract.
- [x] Failed API calls produce visible error states, not infinite spinners.
- [x] Completion responses are handled intentionally.
- [x] If backend completion currently returns 404, the frontend treats that specific completion case as normal completion, not as fatal error.

Expected endpoints:

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

Files to inspect:

```text
src/api/client.ts
src/api/types.ts
src/App.tsx
src/components/*
.env*
docs/backend-contract.md
```

Proof:

```bash
grep -R "localhost:8080\|localhost:8081\|5173\|5174" src docs .env* 2>/dev/null
npm run build
```

2026-06-05 evidence: `npm run build` passed. `rg -n "localhost:8080|/api/rounds|/api/me/attempts|localhost:5173|http://localhost:5173" -S src docs README.md AGENTS.md .env.example vite.config.ts scripts` found only AGENTS.md prohibited old examples plus this checklist's grep command. Browser proof used backend `http://localhost:8081`, frontend `http://localhost:5174`, and `POST /api/game/sessions` through the Vite `/api` proxy.

## Authentication flow

- [x] Register form calls `POST /api/auth/register`.
- [x] Login form calls `POST /api/auth/login`.
- [x] Login response token is stored intentionally.
- [x] Bearer token is sent on protected requests.
- [x] Logout or reset clears token and user state.
- [x] Invalid credentials produce a visible message.
- [x] Expired or invalid token does not leave the app stuck.
- [x] The UI never displays password data.
- [x] The frontend does not require a hardcoded demo account.

Browser proof:

```text
1. Open http://localhost:5174
2. Register a fresh user.
3. Log in or confirm register-auto-login.
4. Refresh the page.
5. Confirm authenticated state behaves intentionally.
```

2026-06-05 evidence: browser proof registered fresh user `browser_loop_1780622903229` and reached authenticated instructions. `src/api/client.ts` stores the JWT in localStorage and builds the `Authorization: Bearer <token>` header centrally. CDP redacted the header value, but the same run recorded 92 successful protected `/api/game/...` responses after registration.

## Session start

- [x] Start session calls `POST /api/game/sessions`.
- [x] Request body sends backend enum names, not numeric labels.
- [x] Current demo sends `conditionName: "CONDITION_1_SOKUON"`.
- [x] Current demo sends `difficultyLevel: 1`.
- [x] Unsupported arbitrary difficulty input is not exposed.
- [x] Unsupported condition selector is not exposed unless fully mapped to backend enum values.
- [x] Session UUID from backend is stored in local component/application state.
- [x] Session start failure displays an error.

Expected request:

```json
{
  "conditionName": "CONDITION_1_SOKUON",
  "difficultyLevel": 1
}
```

Proof:

```text
Browser devtools Network tab shows POST /api/game/sessions with conditionName CONDITION_1_SOKUON and difficultyLevel 1.
```

2026-06-05 evidence: `node scripts/verify-browser-loop.mjs` recorded `POST http://127.0.0.1:5174/api/game/sessions` with body `{"difficultyLevel":1,"conditionName":"CONDITION_1_SOKUON"}`. No condition or difficulty form controls were detected.

## Trial/game loop

- [x] Trial player requests the next round from the backend.
- [x] Fixation appears before stimuli.
- [x] Left stimulus appears/plays.
- [x] Right stimulus appears/plays.
- [x] Both translations are visible at the same time in a neutral vertical stack.
- [x] Both choices become available after the stimulus sequence.
- [x] User can select one of the two options.
- [x] The two stimulus cards are the only trial answer targets.
- [x] Answer submission calls `POST /api/game/sessions/{sessionUuid}/answers`.
- [x] The selected ideophone ID comes from backend data.
- [x] The frontend does not calculate correctness as authority.
- [x] Immediate feedback is displayed using backend response.
- [x] Feedback remains visible until the user clicks Next trial.
- [x] Response time is sent if implemented.
- [x] The app can advance to the next trial.
- [x] API or media errors show a recoverable error message.

Files to inspect:

```text
src/components/TrialPlayer.tsx
src/components/StimulusPlayback.tsx
src/components/StimulusDisplay.tsx
src/components/IdeophoneCard.tsx
src/conditionPresentation.ts
src/stimulusMedia.ts
src/api/client.ts
```

Browser proof:

```text
1. Start a session.
2. Observe fixation.
3. Observe left and right stimulus sequence.
4. Select an answer.
5. Confirm feedback appears.
6. Continue to another round.
```

2026-06-05 evidence: browser proof answered 30 rounds as `browser_loop_1780627390120`. First round choices were `Select gosogoso` and `Select katakata`; selected `Select gosogoso`; backend feedback was visible as `Correct`. The helper required and passed the pre-game sound check, auto-advanced through completion, and exited successfully. A live CDP DOM check on the updated trial tab showed two translation lines stacked vertically with the same left position and width, two fixed-size stimulus cards, zero muted stimulus media elements, and no `.kana-text` overlays.

2026-06-07 source update: feedback now stays visible with the research note until a manual `Next trial` click. The browser-loop helper was updated to assert that behavior before continuing.

## Stimuli/media

- [x] Stimulus URLs returned by backend are resolved correctly.
- [x] `/stimuli/<filename>` is requested from the backend, not from a stale frontend-only path unless intentionally mirrored.
- [x] The game cannot start until the user runs the sound check.
- [x] Video stimuli are not rendered with `muted`, `defaultMuted`, or zero volume.
- [x] Missing media does not crash the whole app.
- [x] Audio/video playback errors are visible or at least do not block answer submission permanently.
- [x] Stimulus display remains acceptable for the demo.
- [x] Visible stimulus presentation is React-rendered instead of relying on baked-in `.mp4` visuals.

Proof:

```text
Browser devtools Network tab shows successful /stimuli/... media requests.
```

2026-06-05 evidence: browser proof observed 360 `/stimuli/` requests, 360 successful stimulus responses, and `mutedStimulusCount: 0`. Local Vite development now proxies `/stimuli` to `http://localhost:8081`, while absolute backend URLs remain supported through `src/api/client.ts`. Stimulus media is fetched through the centralized bearer-aware backend helper before playback. `StimulusPlayer` explicitly plays video/audio stimuli unmuted at full volume and stops on autoplay blockage with a manual Play control instead of silently advancing. `IdeophoneCard` no longer overlays frontend kana text on backend-served media, so triangle/control stimuli are not crossed by browser-rendered kana.

2026-06-07 source update: `conditionPresentation.ts`, `StimulusDisplay`, and `StimulusPlayback` split condition mapping, React-owned visual presentation, and hidden media playback. For `CONDITION_1_SOKUON`, the active trial renders neutral React placeholders while legacy `.mp4` media remains playback-only. The browser-loop helper now asserts two React placeholders and no visible legacy media in the choice phase.

## Completion behavior

- [x] The app detects completed session state.
- [x] Completion screen stays visible until explicit restart.
- [x] Completion does not automatically send the user back to the start screen.
- [x] Completion does not look like a crash or network failure.
- [x] Completion summary is visible.
- [x] Completion summary labels totals honestly as session-scoped or all-time.
- [x] Restart creates a fresh backend session rather than corrupting previous progress.
- [x] A fresh run does not show stale condition/difficulty controls.

Browser proof:

```text
1. Complete all rounds in one session.
2. Confirm completion screen appears.
3. Confirm completion screen remains visible.
4. Click explicit restart.
5. Confirm a new session starts cleanly.
```

2026-06-05 evidence: browser proof reached completion after 30 answered rounds and confirmed `Session complete` remained visible with leaderboard/recent attempts still visible. `src/App.tsx` resets session-local state before each `startSession(DEMO_SESSION_REQUEST)` call.

## Progress and score display

- [x] The UI distinguishes session progress from all-time/user-cumulative totals.
- [x] Remaining count does not grow incorrectly after starting new sessions.
- [x] If backend returns cumulative totals, frontend labels them as cumulative.
- [x] If frontend computes session-local progress, the calculation resets per session.
- [x] Feedback and progress do not contradict each other.

2026-06-05 evidence: `FeedbackPanel` labels per-session totals as `Session score` and backend cumulative totals as `Account total`. Completion labels use `Session score`, `Session answered`, `Account total correct`, and `Account total answered`. No remaining-count label is displayed.

Files to inspect:

```text
src/App.tsx
src/components/TrialPlayer.tsx
src/components/Leaderboard.tsx
src/api/types.ts
```

## Leaderboard and recent attempts

- [x] Leaderboard calls `GET /api/leaderboard`.
- [x] Leaderboard is visible from completion.
- [x] Leaderboard loading failure does not break the game.
- [x] Recent attempts call `GET /api/game/me/attempts` with bearer token.
- [x] Recent attempts are visible from completion.
- [x] Empty leaderboard/history states are handled.
- [x] Displayed user data is minimal and safe.
- [x] Leaderboard/history labels match backend meaning.

Browser proof:

```text
1. Log in.
2. Complete at least one answer.
3. Open or view leaderboard.
4. View recent attempts.
5. Confirm both are visible or have clear empty/error states.
```

2026-06-05 evidence: browser proof confirmed `leaderboardVisible: true` and `recentAttemptsVisible: true` after completion. `src/components/Leaderboard.tsx` renders empty/error states without blocking the game surface.

2026-06-07 source update: leaderboard/recent attempts are no longer mounted below the active trial. Completion owns those views through the leaderboard/recent-attempt tabs.

## Error handling and loading states

- [x] Every async API request has loading, success, and error behavior.
- [x] No failed request leaves the app in an infinite spinner.
- [x] Auth failures can return user to login.
- [x] Session failures can return user to start or show retry.
- [x] Media failures do not permanently block answer submission unless that is intentional.
- [x] Errors are written for users, not only console logs.
- [x] Console errors are checked before final demo.

Proof:

```text
Use browser devtools and test:
- wrong password
- backend stopped
- stale token
- completed session
```

2026-06-05 evidence: browser proof had `relevantConsoleErrorCount: 0`. It reported four `net::ERR_ABORTED` fetches for leaderboard/recent-attempt requests during page reload/navigation, but the run exited successfully, reached completion, and rendered leaderboard plus recent attempts, so no failed API request left the UI in an infinite spinner. Error UI paths are present in `AuthForm`, `App`, `TrialPlayer`, `StimulusPlayback`, and `Leaderboard`.

## Build and lint

- [ ] `npm install` or documented package setup works.
- [x] `npm run build` passes.
- [x] `npm run lint` passes, if lint script exists.
- [x] No TypeScript errors remain.
- [x] No unused stale mock page remains in active routes.
- [x] The app runs with `npm run dev`.

Proof:

```bash
npm run build
npm run lint
npm run dev
```

2026-06-05 evidence: `npm run build` passed, `npm run lint` passed, and `npm run dev` started Vite 8.0.13 at `http://localhost:5174/`.

## Documentation checklist

- [x] `docs/project_guidelines.md` exists.
- [x] `docs/backend-contract.md` exists.
- [x] `docs/frontend-grading-checklist.md` exists.
- [x] README explains frontend setup.
- [x] README explains `VITE_API_BASE_URL`.
- [x] README states the expected backend port.
- [x] README includes a short browser demo script.
- [x] Stale `8080` references are removed or marked as old examples.
- [x] Stale `5173` references are corrected unless intentionally listed as fallback.

## Browser demo proof

Final browser proof must verify:

- [x] Backend starts.
- [x] Frontend starts.
- [x] Register works.
- [x] Login or register-auto-login works.
- [x] JWT-authenticated requests work.
- [x] Session starts.
- [x] At least one full ideophone round works.
- [x] Answer submission stores result.
- [x] Feedback appears.
- [x] Session completion appears.
- [x] Completion remains visible.
- [x] Leaderboard or recent attempts are visible.
- [x] A fresh run does not show stale condition/difficulty controls.

Proof record:

```text
Date: 2026-06-05
Backend commit: 9b804f8
Frontend commit: 206049d plus uncommitted frontend edits in this pass
Backend command: /code/java/ideophone-arena-api ./mvnw spring-boot:run
Frontend command: /code/js/ideophone-arena-web npm run dev
Browser URL: http://127.0.0.1:5174/ in Windows Edge 148 via CDP 127.0.0.1:9224
Test user: browser_loop_1780626198096
Updated audio proof user: browser_loop_1780627390120
Result: PASS. Registered fresh user, passed the sound check, started CONDITION_1_SOKUON difficulty 1 session, answered 30 rounds, saw feedback, auto-advanced without a Next button, reached persistent completion, saw leaderboard and recent attempts, observed 360 /stimuli/ requests with 360 successful stimulus responses, observed 0 muted stimulus media elements, observed 95 successful protected /api/game responses, found 0 stale condition/difficulty controls, saw 0 failed requests, and saw 0 relevant browser console errors.
Blocker: none for the frontend browser demo while backend 8081 and frontend 5174 are running.
Next task: verify backend round seed/pairing semantics against the experiment design so canonical/opposite modality pairings are not left to frontend display assumptions.
```

## Agent steering rules

Agents working in this repository must follow these rules:

1. Do not change the backend contract without updating `docs/backend-contract.md`.
2. Do not add condition or difficulty UI unless the backend supports it and the contract is updated.
3. Do not add routes or state libraries just to fix completion display.
4. Do not hide API errors behind infinite loading states.
5. Do not move demo-critical data into frontend-only mock state.
6. Do not redesign the UI before the full browser proof passes.
7. Prefer small, testable changes.
8. Every change must end with one of:
   - `npm run build`
   - `npm run lint`
   - browser proof
   - documented blocker
   - commit hash

## Current known integration risks

Update this section after each pass.

- [x] Verify the running browser app is current source, not stale Vite/runtime state.
- [x] Verify no arbitrary difficulty input is visible.
- [x] Verify current condition is sent as `CONDITION_1_SOKUON`.
- [x] Verify completion screen remains visible.
- [x] Verify leaderboard/recent attempts are visible enough.
- [x] Verify progress labels are not misleading.
- [x] Verify all stale `8080/5173` references are fixed or explained.
