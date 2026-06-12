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

## Trial flow

See the **Development** and **Backend API** sections above for server setup and
proxy configuration. Leave `VITE_API_BASE_URL` empty to use the Vite proxy for
`/api` and `/stimuli`; set it to `http://localhost:8081` to call the backend
directly.

**Verbatim rendering.** Each round option carries `displayForm` (the visible
pre-answer script, already flipped by the backend for mismatch rounds) and
`canonicalForm` (revealed at feedback together with romaji and meaning). The
frontend renders both verbatim — no kana conversion or detection is performed
client-side. A missing or blank field surfaces the round-problem error state.

**Per-word audio.** Stimulus playback uses per-word audio files
(`/stimuli/audio/<file>.m4a`) fetched through the bearer-aware backend client.
Trial pacing is driven by the media `ended` event. A sound check is required
before the timed round sequence starts.

**Script Lab.** Three presentation options are available before session start:
Audio only (`CONDITION_1_SOKUON`), Script match (`CONDITION_2_SOKUON`), and
Script mismatch (`CONDITION_3_SOKUON`). Audio only shows neutral A/B placeholders
pre-answer; script conditions show the backend `displayForm`. Difficulty is fixed
at `1`; the numeric condition enum and `TEXT_ONLY` are never exposed.

**Practice rounds.** An "Include 2 practice rounds (not scored)" checkbox in
the Script Lab section (default ON) sends `includePractice: true` with the
session start. The backend then serves 2 practice rounds (`practice: true`,
p-prefix stimuli) before scored round 1. Practice rounds show a "Practice
round" header with a "Not scored" badge instead of the round counter and score
readout; feedback works exactly as in scored rounds, but nothing is persisted
and scored play still begins at "Round 1 / 30" with the score at 0.

**Leaderboard.** `GET /api/leaderboard?page&size` returns a paginated wrapper
(`entries`, `page`, `size`, `totalElements`, `totalPages`). Entries rank each
user's best *completed* session (`bestSessionCorrect`, `bestSessionAnswered`,
`bestSessionAccuracy` as a 0–1 fraction; contract change 2026-06-11). The
frontend reads `.entries`, renders "Best session" and "Accuracy" columns, and
shows a Previous/Next pager when `totalPages > 1`.

### Browser path

1. Open `http://localhost:5174`.
2. Register or log in.
3. Run the sound check.
4. Keep Audio only selected, or select Script match / Script mismatch. Keep
   the practice checkbox on for 2 unscored warm-up rounds, or untick it to
   start at Round 1 immediately.
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
