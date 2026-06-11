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

Request body:

```json
{
  "conditionName": "CONDITION_1_SOKUON",
  "difficultyLevel": 1
}
```

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

Ordering is deterministic: `totalCorrect` desc, then `totalAnswered` desc, then average response time asc, then
`username` asc as the final tiebreak.

Response shape:

```json
{
  "entries": [
    { "username": "demo", "totalAnswered": 30, "totalCorrect": 21, "accuracy": 0.7 }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 4,
  "totalPages": 1
}
```

**Breaking change for the frontend:** the previous shape was the bare `entries` array. The Vite app's
`getLeaderboard()` (`src/api/client.ts`) and the `Leaderboard` component read `.entries` and drive a
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
