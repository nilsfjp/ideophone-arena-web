# Ideophone Arena Web

React, Vite, and TypeScript frontend for Ideophone Arena.

## Development

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The development server runs at:

```text
http://localhost:5174
```

## Backend API

The frontend expects the Spring Boot API at:

```text
http://localhost:8081
```

Set the API base URL when running directly against the backend:

```text
VITE_API_BASE_URL=http://localhost:8081
```

If you intentionally use the local Vite proxy for `/api` and `/stimuli`, leave
`VITE_API_BASE_URL` empty in `.env.local`. `.env.local` should stay untracked.

## Demo Path

Backend: `http://localhost:8081`

Frontend: `http://localhost:5174`

Default API base URL: `VITE_API_BASE_URL=http://localhost:8081`

Manual browser proof from the task context: Vite was served at
`http://127.0.0.1:5174/` with `VITE_API_BASE_URL=` so the dev-server `/api`
and `/stimuli` proxies forwarded requests to `http://localhost:8081`. The flow
registered a new user, passed the sound check, started a game session with the
demo setup, completed a session, showed a final summary, and loaded leaderboard
plus recent attempts without leaving the app in a stuck loading state. The same
proof observed successful backend-served `/stimuli/` media requests and no muted
stimulus media elements.

Current game-loop UX keeps answer feedback and the research note visible until
the user clicks `Next round` (the button appears in the reserved question slot at
feedback). Leaderboard and recent attempts are shown from the completion screen
rather than below the active round. The leaderboard is paginated
(`GET /api/leaderboard?page&size`, contract change 2026-06-11): the frontend
reads the wrapper's `entries` and shows a Previous/Next pager when the backend
reports more than one page.

Stimulus playback is separated from visible presentation. The backend serves
per-word audio files (`/stimuli/audio/<file>.m4a`) for playback, and React
renders the visible layer from backend-provided fields: the neutral A/B
placeholder (Audio only) or the round's `displayForm` verbatim (Script match
and Script mismatch). Feedback reveals `canonicalForm`, romaji, and meaning.
The frontend never converts or detects kana.

Script Lab selection is available before session start with exactly three
backend-supported presentation options: Audio only, Script match, and Script
mismatch. The default remains Audio only, difficulty remains fixed at `1`, and
React renders placeholders or script rather than trusting baked-in video visuals.

Remaining blocker: none for the frontend demo path while the backend is running
on port `8081`.

Browser path:

1. Open `http://localhost:5174`.
2. Register or log in.
3. Run the sound check.
4. Keep Audio only selected, or select Script match / Script mismatch for the
   supported Script Lab presentation comparison.
5. Start Game.
6. Watch the fixation, left word, right word, and choice phase.
7. Choose one card.
8. Confirm backend feedback identifies selected and correct card details.
9. Click `Next round` to continue.
10. Finish the session and see the completion summary.
11. Use the completion tabs for leaderboard or recent attempts.
12. Start a new game and confirm the demo setup resets cleanly.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run preview
node scripts/verify-presentation-logic.mjs
```
