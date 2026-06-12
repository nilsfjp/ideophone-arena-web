# Ideophone Arena frontend/backend contract

Date: 2026-06-07

## Purpose

This document records the backend/frontend contract for the playable Phase 2
frontend. It exists to keep Script Lab and presentation work aligned with the
Spring Boot API.

## Backend base URL

Local backend:

```text
http://localhost:8081
```

For local Vite development, leaving `VITE_API_BASE_URL` empty uses the dev-server
proxy for `/api` and `/stimuli`. With `VITE_API_BASE_URL=http://localhost:8081`,
the frontend calls the backend directly.

## Supported session-start settings

The default game path uses:

```json
{
  "conditionName": "CONDITION_1_SOKUON",
  "difficultyLevel": 1
}
```

Script Lab may swap `conditionName` among exactly these supported values:

```text
CONDITION_1_SOKUON
CONDITION_2_SOKUON
CONDITION_3_SOKUON
```

Do not expose `TEXT_ONLY`, numeric condition values, or arbitrary difficulty
selection. `difficultyLevel` remains fixed to `1`.

Round responses expose, for both `left` and `right`: `kana`, `displayForm`,
`canonicalForm`, `romaji`, `canonicalScript`, `stimulusFile`, and `stimulusUrl`.

- `displayForm` is the authoritative visible script for the pre-answer card in
  the script conditions. The frontend renders it verbatim and never converts,
  detects, or recomputes kana from other fields (experiment invariant 3).
  Mismatch rounds arrive with `displayForm` already flipped by the backend.
- `canonicalForm` is the canonical-script form revealed at feedback together
  with romaji and meaning.
- If `displayForm` (script conditions) or `canonicalForm` (any supported
  condition) is missing or blank, the frontend shows the round-problem error
  state instead of guessing a display form.
- `stimulusUrl` points at per-word audio, e.g. `/stimuli/audio/a0h-gosogoso.m4a`.
  Trial pacing is driven by the media `ended` event.

## Authentication

The frontend logs in through:

```text
POST /api/auth/login
```

The response contains a JWT token. Protected requests must send:

```text
Authorization: Bearer <token>
```

## Game flow

Start session:

```text
POST /api/game/sessions
```

Request body (`includePractice` optional, backend default `false`; the
frontend always sends it explicitly and defaults the toggle to `true`):

```json
{
  "conditionName": "CONDITION_1_SOKUON",
  "difficultyLevel": 1,
  "includePractice": true
}
```

The session response echoes `includePractice`.

Get next round:

```text
GET /api/game/sessions/{sessionUuid}/rounds/next
```

Submit answer:

```text
POST /api/game/sessions/{sessionUuid}/answers
```

Request body:

```json
{
  "roundId": 1,
  "selectedIdeophoneId": 1,
  "responseTimeMs": 1200
}
```

The answer response includes a `practice` boolean mirroring the round's flag
(always `false` for scored rounds).

## Practice rounds (2026-06-11)

When a session is started with `"includePractice": true`, the next-round
endpoint serves **2 practice rounds** (p-prefix stimuli, e.g.
`/stimuli/audio/p0h-sotto.m4a`) before the first scored round. Practice rounds
use the same round DTO with `practice: true`; scored rounds carry
`practice: false`.

Practice answers return normal correctness feedback (`practice: true` in the
answer response) but are never persisted: `totalAnswered`/`totalCorrect` stay
at the session's scored counts (0 during practice), and practice cannot affect
completion or the leaderboard. Practice rounds do not consume round numbers:
"Round 1 / 30" still means the first scored round.

Frontend behavior: the instructions screen has an "Include 2 practice rounds
(not scored)" checkbox in the Script Lab section, default ON; the flag is
always sent explicitly. During a practice round the trial header shows
"Practice round" with a "Not scored" badge instead of the round counter and
score readout, the progress bar stays at its pre-game 0%, and feedback behaves
exactly as in scored rounds. Practice answers never increment session-local
stats.

## Completion behavior

When there are no more unanswered rounds, the backend may return an explicit
completion payload or a completion-related response. The frontend must treat
session completion as a normal UI state, not as a fatal error or automatic reset.

## Progress display

Do not rely on cumulative user-wide totals for per-session remaining count. The frontend should maintain session-local answered/correct counts, or the backend should provide session-scoped totals.

## Leaderboard

Public leaderboard, paginated (changed 2026-06-11; previously returned a bare array):

```text
GET /api/leaderboard?page=0&size=10
```

Query params: `page` (default `0`, clamped to `>= 0`) and `size` (default `10`, clamped to `1..50`). Out-of-range
values are clamped, not rejected; the response metadata reports the effective values.

The metric is **best completed session** (changed 2026-06-11; previously lifetime account totals): each user is
ranked by the highest number of correct answers within a single *completed* session. Incomplete sessions never
count. Ordering is deterministic: `bestSessionCorrect` desc, then best-session accuracy desc (equivalently
`bestSessionAnswered` asc), then `username` asc.

Response shape (`bestSessionAccuracy` is a 0–1 fraction):

```json
{
  "entries": [
    { "username": "demo", "bestSessionCorrect": 21, "bestSessionAnswered": 30, "bestSessionAccuracy": 0.7 }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 4,
  "totalPages": 1
}
```

Entry fields were renamed/re-scoped on 2026-06-11 from the lifetime
`totalAnswered`/`totalCorrect`/`accuracy`; the wrapper is unchanged. The Vite app's `getLeaderboard()`
(`src/api/client.ts`) and the `Leaderboard` component read `.entries`, render "Best session"
(`bestSessionCorrect / bestSessionAnswered`) and "Accuracy" (percentage) columns, and drive a
Previous/Next pager from the page metadata (hidden when `totalPages <= 1`).

This should be visible in the final demo.

## Recent attempts

Authenticated user history:

```text
GET /api/game/me/attempts
```

This is enough for minimal personal progress/history.

## Media

Stimulus media is served by the backend under:

```text
GET /stimuli/**
```

The frontend may proxy this path during local Vite development, but the media
authority remains the backend. If the backend protects media requests, the
frontend should fetch media through the centralized bearer-token client and play
the returned blob URL rather than loading the protected URL directly in a media
element.

The frontend should require a pre-game sound check before starting the timed
round sequence. Media must not be force-muted by the frontend. If
unmuted autoplay is blocked by the browser, the frontend should show a manual
play control instead of silently advancing as if the participant heard the
sound.
