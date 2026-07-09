# Ideophone Arena frontend/backend contract

Date: 2026-07-09

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

The default (Meaning Match) game path uses:

```json
{
  "conditionName": "CONDITION_1_SOKUON"
}
```

Script Lab may swap `conditionName` among exactly these supported values:

```text
CONDITION_1_SOKUON
CONDITION_2_SOKUON
CONDITION_3_SOKUON
```

Do not expose `TEXT_ONLY` or numeric condition values. `difficultyLevel` is no
longer a request field (removed backend-side, NIL-42/A3): the Perception Ladder
selects a floor through an explicit `floor` parameter (see "Perception Ladder"),
never an overloaded difficulty.

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
  "includePractice": true
}
```

The session response echoes `includePractice`. LADDER sessions additionally
carry `gameMode` and `floor` (see "Perception Ladder").

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

## Perception Ladder (NIL-42)

A play mode that serves the Choosing Task one modality "floor" at a time, in the
implicational-hierarchy climb order Sound → Sight → Touch → Inner states.

Floor overview:

```text
GET /api/game/ladder/floors
```

Response — floors in climb order; the **array index is the floor ordinal** (the
frontend derives "Floor n" from array position and never persists it):

```json
{
  "floors": [
    {
      "modality": "AUDITORY",
      "pairCount": 10,
      "finalRungPairCode": "a5",
      "cleared": false,
      "bestCorrect": null,
      "bestAnswered": null,
      "pairs": [{ "pairCode": "a9", "finalRung": false }]
    }
  ]
}
```

- Floors carry no name/description/thesis-mean; the frontend supplies those per
  modality (`src/ladderText.ts`).
- `cleared` is true once the caller has a completed LADDER session for the floor;
  `bestCorrect` / `bestAnswered` are that best session's score (both `null` while
  uncleared).
- `finalRungPairCode` marks the floor's last (hardest) pair; the frontend shows a
  "Final rung" specimen label on it.

Start a floor session (same `POST /api/game/sessions` endpoint):

```json
{
  "conditionName": "CONDITION_1_SOKUON",
  "gameMode": "LADDER",
  "floor": "AUDITORY"
}
```

- `floor` is a `Modality`, required iff `gameMode == "LADDER"` and forbidden
  otherwise.
- LADDER sessions **reject `includePractice`** — omit it.
- The session response carries `gameMode` and `floor`.
- Round serving (`.../rounds/next`) and answers (`.../answers`) are the ordinary
  Choosing endpoints, unchanged; each round option carries the floor's `modality`.
- A completed LADDER session does **not** enter the Meaning Match leaderboard.

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

## Production — Word Mint (2026-07-09, backend NIL-62)

```text
GET  /api/productions/next
POST /api/productions
GET  /api/game/me/productions?page=0&size=10
GET  /api/research/triangulation           (no auth)
```

The production measure: the player reads a meaning and invents a word for it.
Persistence is `UNIQUE(user_id, word_id)` — **one try per word, for life** — so
"your first instinct is the datum" is enforced by the database, not the UI.

**`GET /api/productions/next`** →
`{ completed, ideophoneId, gloss, modality, totalProducible }`. The meaning is
the whole prompt: no romaji, no kana, no audio pre-submit. Once every word is
produced, the completion sentinel is `{ completed: true, ideophoneId: null,
gloss: null, modality: null, totalProducible }` (the `RoundResponse`
precedent). Selection is deterministic and stateless — the caller's production
count is the cycle cursor, cycling `AUDITORY → VISUAL → HAPTIC →
INTEROCEPTIVE`, lowest word id within a modality, skipping exhausted ones.

`totalProducible` is the `{n}` of the frozen `WORD {i} OF {n} · YOUR MEAN {m}`
status line (`SPEC-view-designs.md` §8.4). It is **caller-invariant** — minting
advances `{i}`, never shrinks `{n}` — and is carried on the sentinel too, so
the status line survives the last round. It counts words in ≥1 non-practice
trial *within the four cycle modalities* (`Modality` also has `TACTILE` and
`MOTION`, which the cycle never serves). Currently 94. **Never derive or
hardcode it** (V14) — the same rule as `session.totalRounds`.

**`POST /api/productions`** body
`{ ideophoneId, input, responseTimeMs, sessionUuid }` → `201`:

```json
{
  "id": 40, "ideophoneId": 60, "input": "pikapika", "similarityScore": 78,
  "features": [
    { "feature": "redup",           "yours": true,  "target": true,  "matched": true  },
    { "feature": "sokuon",          "yours": false, "target": false, "matched": true  },
    { "feature": "finalN",          "yours": false, "target": false, "matched": true  },
    { "feature": "riSuffix",        "yours": false, "target": false, "matched": true  },
    { "feature": "voicedOnset",     "yours": false, "target": true,  "matched": false },
    { "feature": "heavyVowelRatio", "yours": 0.00,  "target": 0.50,  "matched": false },
    { "feature": "moraCount",       "yours": 4,     "target": 4,     "matched": true  }
  ],
  "target": { "displayForm": "どきどき", "romaji": "dokidoki",
              "gloss": "with a rapid heartbeat",
              "stimulusUrl": "/stimuli/audio/i9h-dokidoki.m4a" }
}
```

`features` always carries all **seven** entries in the frozen chip order of
`SPEC-view-designs.md` §8.3. `yours`/`target` are heterogeneous by design: five
booleans, `moraCount` an integer, `heavyVowelRatio` a 2-dp decimal. `matched`
means the feature contributed its full weight — **a shared absence still
matches**. The client decides which features become chips (§2.3.5: those
present in either form, plus the two continuous features always); the full
seven drive the comparison-table twin. `similarityScore` is
`round_half_even(100 × similarity)` under `scorer_version = 1`; an exact form
match is `100`. The client never recomputes the score or the features.

Status codes: `input` is trimmed + lowercased, must match `^[a-z]{2,24}$` **and**
segment into morae — either failure is **`400` with `validationErrors.input`,
and the attempt is not consumed** (nothing is written; the player's one try
survives a typo). Unknown `ideophoneId` → `404`. Duplicate → `409` (including
the concurrent case, via `saveAndFlush`). `sessionUuid` is optional and
gameMode-agnostic (provenance only); unknown → `404`, another user's → `403`.
`responseTimeMs`, if present, must be `0..600000`.

The frontend renders the frozen §8.1 parse helper on a `400` — **never the
backend's `validationErrors.input` text**, which is developer-facing and would
ship unfrozen copy. Read presence from `ApiError.body.validationErrors?.input`;
never from `ApiError.message`, which is prefixed with the field name.

Kana discipline: the only kana shown is `target.displayForm`, rendered verbatim
with `lang="ja"` after submit. The player's romaji is displayed exactly as typed
and is never converted (invariant 1/3).

**`GET /api/game/me/productions`** → the standard paginated wrapper; entries are
`{ id, ideophoneId, input, similarityScore, createdAt }`, most recent first
(descending id breaks same-second ties). `page` clamped `≥ 0`, `size` clamped
`1..50`. Word Mint page-walks this once on mount to seed `{i}` (`totalElements`)
and `{m}` (the mean of `similarityScore`), then updates both locally from each
`201`. Entries carry **no** `modality`, so a per-modality breakdown is not
currently derivable client-side.

**`GET /api/research/triangulation`** (public) extends the divergence pattern
with `meanProductionScore` / `productionCount`, one row per word with *any*
data. Its key set is a superset of `/api/research/divergence`, which is
unchanged. **Not consumed by the frontend yet** — the §2.4 completion benchmark
that would use it needs unfrozen copy, so it is deferred.

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
