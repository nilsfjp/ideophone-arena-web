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

The round payload carries `targetMeaningListedFirst` (2026-07-03, additive):
the seed-drawn boolean deciding which gloss fills which of the two meaning
lines. `TrialPlayer` renders the frozen line prefixes in place ("One of them
means …" always first) and swaps only the glosses; a missing flag (older
backend) falls back to the historical target-first order. The draw is part of
the session's deterministic derivation, so refetching the same round returns
the same order.

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

## Ratings (2026-07-02, backend NIL-32/33/34)

The Rating Lab (27D) submits one 1–7 iconicity rating per (user, ideophone).

```text
POST /api/ratings            (authenticated)
```

Request body:

```json
{
  "ideophoneId": 1,
  "rating": 6,
  "responseTimeMs": 1500,
  "sessionUuid": "..."
}
```

`ideophoneId` (required, positive) and `rating` (required, 1..7) are validated
server-side; `responseTimeMs` (optional) must be 0..600000; `sessionUuid`
(optional) is provenance only. Success returns **201**:

```json
{
  "id": 42,
  "ideophoneId": 1,
  "rating": 6,
  "responseTimeMs": 1500,
  "ratedAt": "2026-07-02T12:34:56Z"
}
```

Errors: **409** when the user has already rated the ideophone (ratings are
NOT upserts — `(user_id, ideophone_id)` is unique and a rating can never be
changed through this API), 400 on validation failures, 404 for an unknown
ideophone or sessionUuid, 403 when the sessionUuid belongs to another user,
401 unauthenticated. The frontend pre-loads existing ratings, shows them
read-only, and treats a mid-run 409 as "already rated". Since 27E the
frontend sends no `sessionUuid` at all: server-pool words carry no session
provenance, and ratings are keyed by `(user, ideophone)` alone.

```text
GET /api/game/me/ratings?page=0&size=50    (authenticated)
```

Returns the caller's ratings newest-first in the same paginated wrapper as the
leaderboard (`entries` / `page` / `size` / `totalElements` / `totalPages`);
`size` is clamped to 1..50 and out-of-range params are clamped, not rejected.
`getAllMyRatings()` in `src/api/client.ts` walks all pages.

```text
GET /api/game/me/ratable-words?page=0&size=50  (authenticated)
```

The Rating Lab's word pool, served by the backend since 27E (2026-07-03). The
contamination rule is enforced server-side: entries are the caller's words
encountered through answered (scored) Choosing rounds — feedback is the only
place the word→meaning mapping is revealed — minus words already rated. Same
paginated wrapper as `/me/ratings`; entries are
`{ ideophoneId, canonicalForm, romaji, stimulusFile, modality, meaning }`
(`meaning` is the word's own gloss, exactly as feedback showed it), in stable
first-encounter order, deduplicated. `src/ratingPool.ts` is now a thin client
(`fetchRatingPool()` walks the pages); the former `ideophone-arena-rating-pool`
localStorage pool is retired without migration — it broke for any multi-device
user, which the server pool fixes by construction.

## Research divergence (public)

```text
GET /api/research/divergence               (no auth)
```

Returns a **bare JSON array** (no pagination wrapper), one row per ideophone
with at least one guess or rating:

```json
[
  {
    "ideophoneId": 1,
    "romaji": "gosogoso",
    "gloss": "rustling",
    "modality": "SOUND",
    "guessAccuracy": 0.72,
    "guessCount": 25,
    "meanRating": 6.0,
    "ratingCount": 4
  }
]
```

`guessAccuracy` and `meanRating` are `null` (not 0) when that side has zero
observations — the client must distinguish "no data" from "always wrong" /
"lowest rating". The Rating Lab shows these as a per-word "Arena record"
reveal after each rating and joins them into the Lab record table. Framing
stays descriptive (counts and averages), per the flavor-text rule.
