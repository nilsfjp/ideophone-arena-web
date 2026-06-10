You are working on the frontend repo for Ideophone Arena.

Repo paths:

- Frontend repo: `/code/js/ideophone-arena-web`
- Backend repo: `/code/java/ideophone-arena-api`
- You may inspect the backend repo at `../ideophone-arena-api` or `/code/java/ideophone-arena-api` to discover the actual controller paths, DTO names, response shapes, auth behavior, and CORS expectations.
- Do not modify the backend unless the user explicitly asks. If the frontend needs a backend change, write a short note describing the missing or mismatched endpoint.

Primary goal:
Implement a minimal React + Vite + TypeScript frontend that follows the actual Ideophone Arena trial flow from the uploaded screenshots and HTML snapshot.

Reference materials:

- Uploaded screenshots show the intended visual trial flow.
- Uploaded HTML snapshot:
  `/mnt/data/No title (2026-06-03 10：46：55).html`
  This is a saved Gorilla trial page after both stimuli have finished playing. Use it as a visual reference for layout, scale, positioning, typography, and interaction state. Do not copy the entire Gorilla HTML structure or embedded styling. Recreate the relevant layout cleanly in React.
- Backend implementation should be inspected directly in:
  `/code/java/ideophone-arena-api/src/main/java/...`
- Database schema reference is in:
  `/code/java/ideophone-arena-api/docs` or `src/main/resources`, depending on where the backend Codex placed it. Search for `generate-ideophone-arena.sql`.

Hard deadline context:
This is a Spring Boot course project due June 5, 2026. Prioritize a demonstrable MVP over polish.

Frontend stack:

- React
- Vite
- TypeScript
- Plain CSS is preferred unless Tailwind is already installed.
- Do not add heavy UI libraries.
- Do not add state-management libraries.
- Do not add routing libraries unless already present. A simple local state view switch is enough.

MVP user flow:

1. Visitor can register.
2. Visitor can log in.
3. Logged-in user sees instructions.
4. Logged-in user starts a game session.
5. App fetches the next playable round.
6. App presents the trial loop exactly enough to match the screenshots.
7. User selects one of two ideophone options.
8. App submits the answer with response time.
9. App shows immediate feedback.
10. User can continue to the next round.
11. User can see a simple leaderboard or recent attempts if backend endpoint exists.

Do not build:

- Thesis-style experiment logic.
- Consent forms.
- Counterbalancing UI.
- Admin panel.
- Unlockable levels.
- Rich statistics.
- Full Gorilla clone.
- Animations beyond what is needed for the trial flow.
- Complex routing.
- User profile editing.
- Audio calibration screen.
- Mobile-first polish before the desktop MVP works.

Critical trial flow:
Implement this as a frontend state machine.

The intended flow for each trial is:

1. Instructions are shown before gameplay.
2. Trial starts.
3. Fixation cross appears.
4. The translation text appears.
5. The left ideophone appears and its stimulus plays.
6. The left ideophone disappears.
7. The right ideophone appears and its stimulus plays.
8. After the second stimulus finishes, both ideophones become visible again.
9. Two clickable answer options appear below the translations.
10. User chooses one option.
11. Frontend submits the selected ideophone and response time.
12. Backend returns correctness.
13. Frontend shows feedback.
14. User clicks Next to fetch the next round.

Use these frontend trial phases:

```ts
type TrialPhase =
  | "idle"
  | "loading"
  | "fixation"
  | "left-playing"
  | "right-playing"
  | "choice"
  | "submitting"
  | "feedback"
  | "complete"
  | "error";
```

Timing behavior:

- Fixation cross: 700 to 1000 ms. Use 800 ms unless backend provides timing.
- Left stimulus starts after fixation.
- Right stimulus starts immediately after left stimulus finishes.
- Choice buttons become visible only after right stimulus finishes.
- Response time starts when the choice phase begins, not when the round is fetched.
- Send `responseTimeMs` to backend as an integer.

Media behavior:

- Each ideophone option likely has a `stimulusFile` or `stimulusUrl`.
- Inspect backend DTOs to see what field is returned.
- If backend returns `stimulusUrl`, use it directly.
- If backend returns only `stimulusFile`, look for media files in frontend `public/stimuli`.
- Preferred frontend path if only a filename is returned:
  `/stimuli/${stimulusFile}`
- Do not invent media filenames. Use the filename returned by backend.
- If a media file is missing or fails to play, the trial must not freeze. Log the error, wait a short fallback duration such as 1200 ms, and advance to the next phase.
- If the returned stimulus files are `.mp4`, use a hidden or visually minimal `<video>` element and use `onEnded`.
- If the stimulus is audio-only, support `<audio>` as well.
- A robust solution is a `StimulusPlayer` component that accepts `src`, `visible`, `autoplayToken`, `onEnded`, and `onError`.

Expected backend endpoints:
Do not hardcode these blindly. Inspect the backend controllers first.

Likely endpoint set:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/game/sessions`
- `GET /api/game/sessions/{sessionUuid}/rounds/next`
- `POST /api/game/sessions/{sessionUuid}/answers`
- `GET /api/leaderboard`
- Possibly `GET /api/game/me/attempts`
- `GET /api/health`

If actual backend endpoints differ, adapt the frontend to the backend. The backend is the source of truth.

Authentication:

- Use JWT if backend returns a token.
- Store token in `localStorage` for the MVP.
- Add `Authorization: Bearer <token>` to protected API requests.
- Also store the username if returned.
- Add a logout button that clears localStorage and returns to login.
- If a protected request returns 401 or 403, clear auth state and show login.

API client:
Create a dedicated API layer. Suggested files:

```text
src/
  api/
    client.ts
    types.ts
  components/
    AuthForm.tsx
    Instructions.tsx
    TrialPlayer.tsx
    IdeophoneCard.tsx
    StimulusPlayer.tsx
    FeedbackPanel.tsx
    Leaderboard.tsx
  App.tsx
  main.tsx
  index.css
```

Use `VITE_API_BASE_URL` with fallback:

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
```

Create `.env.example`:

```text
VITE_API_BASE_URL=http://localhost:8080
```

API client requirements:

- Centralize `fetch`.
- Automatically attach token when available.
- Throw readable errors for non-2xx responses.
- Try to parse JSON error bodies, but fall back to text.
- Keep API functions small and typed.

Suggested API functions:

```ts
register(request: RegisterRequest): Promise<AuthResponse | unknown>
login(request: LoginRequest): Promise<AuthResponse>
startSession(request?: StartSessionRequest): Promise<GameSessionResponse>
getNextRound(sessionUuid: string): Promise<RoundResponse>
submitAnswer(sessionUuid: string, request: SubmitAnswerRequest): Promise<AnswerResultResponse>
getLeaderboard(): Promise<LeaderboardEntry[]>
getMyAttempts(): Promise<AttemptResponse[]>
```

TypeScript types:
Inspect backend DTOs and match actual fields. Start from these expected shapes, then adjust.

```ts
export type AuthResponse = {
  token: string;
  username?: string;
  role?: string;
};

export type StartSessionRequest = {
  difficultyLevel?: number;
  conditionName?: string;
};

export type GameSessionResponse = {
  sessionUuid: string;
  difficultyLevel?: number;
  conditionName?: string;
  startedAt?: string;
};

export type IdeophoneOption = {
  ideophoneId: number;
  kana: string;
  romaji?: string;
  gloss?: string;
  canonicalScript?: string;
  modality?: string;
  stimulusFile?: string;
  stimulusUrl?: string;
};

export type RoundResponse = {
  sessionUuid?: string;
  roundId: number;
  prompt: string;
  translations?: {
    target?: string;
    other?: string;
  };
  left: IdeophoneOption;
  right: IdeophoneOption;
  timing?: {
    fixationMs?: number;
    preChoiceDelayMs?: number;
  };
};

export type SubmitAnswerRequest = {
  roundId: number;
  selectedIdeophoneId: number;
  responseTimeMs: number;
};

export type AnswerResultResponse = {
  roundId: number;
  selectedIdeophoneId: number;
  correctIdeophoneId?: number;
  correct: boolean;
  prompt?: string;
  correctKana?: string;
  selectedKana?: string;
  totalAnswered?: number;
  totalCorrect?: number;
};

export type LeaderboardEntry = {
  username: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracy?: number;
};

export type AttemptResponse = {
  answeredAt?: string;
  prompt?: string;
  selectedKana?: string;
  correctKana?: string;
  correct: boolean;
  responseTimeMs?: number;
};
```

Layout requirements:
Use the screenshots and HTML snapshot as visual references.

Minimum acceptable layout:

- Centered game area on a neutral background.
- Instructions screen with simple readable text and Start button.
- Fixation phase: centered `+`, large, plain.
- Stimulus phases:
  - Translation area visible above.
  - One ideophone card visible at a time.
  - Left ideophone appears first, then disappears.
  - Right ideophone appears second.

- Choice phase:
  - Both ideophones visible at the top or middle.
  - Two large answer buttons below the translation area.
  - Buttons display kana prominently.
  - Optional smaller romaji/gloss under kana if available.

- Feedback phase:
  - Show “Correct” or “Incorrect”.
  - Show selected kana and correct kana if backend provides them.
  - Show running score if backend provides it.
  - Show Next button.

Do not expose the correct answer before submission:

- Do not display `correctIdeophoneId` during the choice phase even if accidentally returned.
- Do not infer correctness locally for UI before backend response.
- The frontend should only display correctness after `submitAnswer` returns.

Implementation details for `TrialPlayer`:

- Props should include `sessionUuid`, `round`, `onNeedNextRound`, and `onSessionComplete` or equivalent.
- Use `useEffect` to transition from fixation to left-playing.
- Use a phase token or round id to avoid stale timers affecting a later round.
- Clear timers on unmount or round change.
- Use `performance.now()` to calculate response time.
- Disable answer buttons while submitting.
- Prevent double submission.
- After feedback, clicking Next fetches another round.

Pseudocode:

```ts
useEffect(() => {
  if (!round) return;

  setPhase("fixation");
  const ms = round.timing?.fixationMs ?? 800;

  const id = window.setTimeout(() => {
    setPhase("left-playing");
  }, ms);

  return () => window.clearTimeout(id);
}, [round?.roundId]);

function handleLeftEnded() {
  setPhase("right-playing");
}

function handleRightEnded() {
  choiceStartedAtRef.current = performance.now();
  setPhase("choice");
}

async function handleSelect(option: IdeophoneOption) {
  if (phase !== "choice") return;

  const startedAt = choiceStartedAtRef.current ?? performance.now();
  const responseTimeMs = Math.round(performance.now() - startedAt);

  setPhase("submitting");

  const result = await submitAnswer(sessionUuid, {
    roundId: round.roundId,
    selectedIdeophoneId: option.ideophoneId,
    responseTimeMs,
  });

  setAnswerResult(result);
  setPhase("feedback");
}
```

Frontend screens:

1. `Login/Register`
   - Minimal tabs or two forms.
   - Login stores token and moves to instructions.
   - Register either logs in automatically if backend returns token, or shows message asking user to log in.

2. `Instructions`
   - Explain the game in plain terms:
     “You will see a translation and hear or see two Japanese ideophones. Watch/listen to both, then choose the one that best matches the translation.”
   - Start Game button calls `startSession`.

3. `Game`
   - Owns `sessionUuid`, current round, loading/error state.
   - Calls `getNextRound`.
   - Renders `TrialPlayer`.

4. `Leaderboard` or `Attempts`
   - Add only if backend endpoint already exists.
   - Keep it minimal.

Endpoint discovery procedure:
Before implementing API calls, inspect these backend files:

- `src/main/java/**/controller/*Controller.java`
- `src/main/java/**/dto/*.java`
- `src/main/java/**/security/*.java`
- `src/main/java/**/config/*Security*.java`
- `src/main/java/**/config/*Cors*.java`
- `src/main/resources/application*.properties`

Commands:

```sh
cd /code/js/ideophone-arena-web
pwd
find ../ideophone-arena-api/src/main/java -type f | sort | sed -n '1,160p'
grep -R "RequestMapping\\|GetMapping\\|PostMapping" -n ../ideophone-arena-api/src/main/java || true
grep -R "record .*Response\\|class .*Response\\|record .*Request\\|class .*Request" -n ../ideophone-arena-api/src/main/java || true
```

Build and verification:

- Run `npm install` if needed.
- Run `npm run build` before finishing.
- Run `npm run dev -- --host 0.0.0.0` for local testing if needed.
- Check browser console for CORS/auth errors.
- If backend is running, manually verify:
  1. Register or login.
  2. Start session.
  3. Fetch first round.
  4. Trial phases advance.
  5. Answer submits.
  6. Feedback appears.
  7. Next round can load.

Expected final proof:
At the end, report:

- Files changed.
- How to run frontend.
- Which backend endpoints were detected and used.
- Whether media files were found.
- Whether `npm run build` passes.
- Any backend mismatch/blocker.

Minimal demo script:

```sh
cd /code/js/ideophone-arena-web
npm install
npm run dev -- --host 0.0.0.0
```

Then open:

```text
http://localhost:5173
```

Implementation priorities:

1. Inspect backend endpoint contracts.
2. Create typed API client.
3. Create login/register flow.
4. Create instructions screen.
5. Create session start and next-round fetch.
6. Implement trial state machine.
7. Implement answer submission and feedback.
8. Implement minimal leaderboard/attempts only if endpoint exists.
9. Polish only enough to resemble the reference screenshots.
10. Build successfully.

Do not spend time on:

- Full visual fidelity.
- Animations.
- Theme systems.
- Accessibility beyond basic labels/buttons.
- Complex CSS architecture.
- Refactoring generated Vite boilerplate beyond what is necessary.
- Tests unless the app already works.
