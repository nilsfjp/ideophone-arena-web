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
the user clicks `Next trial`. Leaderboard and recent attempts are shown from the
completion screen rather than below the active trial.

Stimulus playback is separated from visible presentation. Legacy `.mp4` files
may still provide sound, but React renders the visible audio placeholder or
script layer through the condition presentation boundary.

Remaining blocker: none for the frontend demo path while the backend is running
on port `8081`.

Browser path:

1. Open `http://localhost:5174`.
2. Register or log in.
3. Run the sound check.
4. Start New Game.
5. Watch the fixation, left stimulus, right stimulus, and choice phase.
6. Choose one ideophone.
7. Confirm backend feedback and the research note stay visible.
8. Click `Next trial` to continue.
9. Finish the session and see the completion summary.
10. Use the completion tabs for leaderboard or recent attempts.
11. Start a new game and confirm the demo setup resets cleanly.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```
