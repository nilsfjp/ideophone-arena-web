import { writeFile } from "node:fs/promises";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5174/";
const cdpVersionUrl = process.argv[3] ?? "http://127.0.0.1:9224/json/version";
// Optional viewport width (e.g. 375 for the mobile run); omit for desktop.
const viewportWidth = process.argv[4] ? Number(process.argv[4]) : null;
const viewportLabel = viewportWidth ? `${viewportWidth}px` : "desktop";
// Backend base URL for the fresh-client pool-parity probe (27E).
const apiBaseUrl = process.env.ARENA_API_URL ?? "http://127.0.0.1:8081";

const username = `browser_loop_${Date.now()}`;
const email = `${username}@example.test`;
const password = "password123";
let nextId = 1;
const pending = new Map();
const consoleMessages = [];
const consoleErrors = [];
const failedRequests = [];
const requestUrls = new Map();
const requestMeta = new Map();
const sessionRequests = [];
const protectedRequests = [];
const stimulusRequests = [];
const ratableWordsRequests = [];
// Successful GET .../rounds/next responses, in arrival order; the last entry
// is always the round currently on screen (the app fetches exactly once per
// round), so its body is the ground truth for the meaning-order assertion.
const roundFetches = [];
const meaningOrderRounds = [];
let roundRefetchProof = null;
const screenshots = [];
const feedbackShotsTaken = new Set();
let practiceShotTaken = false;
let replayWaypointDone = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Verdict assertions are collected, not thrown: a run reports every mismatch it can see,
// rather than stopping at the first. Three stale assertions once rotted behind the A10
// register wall for two releases and surfaced one per run as each was cleared.
//
// `check` is for verdicts on data already in hand -- their failure does not invalidate
// what comes after. Navigation prerequisites (element missing, timed out, session never
// completed) still throw: nothing downstream of them is meaningful.
const assertionFailures = [];

function check(condition, message) {
  if (!condition) {
    assertionFailures.push(message);
  }
  return Boolean(condition);
}

function reportAssertionFailures() {
  if (assertionFailures.length === 0) {
    return;
  }
  console.error(`\n${assertionFailures.length} assertion failure(s):`);
  assertionFailures.forEach((failure, index) => {
    console.error(`  ${index + 1}. ${failure}`);
  });
}

// A self-contained proof stage. Its failure is recorded and the run continues, so one
// broken walkthrough cannot hide findings from the checks after it. A stage that drives
// the UI leaves the DOM somewhere unknown when it throws, so live-DOM checks downstream
// are skipped rather than reported against whatever view happened to be mounted --
// passive evidence (console errors, captured requests, sampled geometry) stays valid.
let domStateTrusted = true;

async function runStage(label, fn, { navigates = false } = {}) {
  try {
    return await fn();
  } catch (error) {
    assertionFailures.push(`${label} stage failed: ${error.message}`);
    if (navigates) {
      domStateTrusted = false;
    }
    return null;
  }
}

async function waitFor(condition, label, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await condition();
    if (value) {
      return value;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function getDebuggerUrl() {
  const cdpBase = cdpVersionUrl.replace(/\/json\/version$/, "");
  let response = await fetch(`${cdpBase}/json/new?about:blank`, {
    method: "PUT",
  });

  if (!response.ok) {
    response = await fetch(`${cdpBase}/json/list`);
  }

  if (!response.ok) {
    throw new Error(`CDP target endpoint failed: ${response.status}`);
  }

  const payload = await response.json();
  const target = Array.isArray(payload)
    ? payload.find((item) => item.type === "page") ?? payload[0]
    : payload;

  if (!target?.webSocketDebuggerUrl) {
    throw new Error("No page websocket target found");
  }

  return target.webSocketDebuggerUrl;
}

function send(ws, method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
  });
}

async function evaluate(ws, expression, awaitPromise = true) {
  const result = await send(ws, "Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }
  return result.result?.value;
}

async function clickText(ws, text) {
  return evaluate(
    ws,
    `(() => {
      const el = [...document.querySelectorAll("button")].find((button) =>
        button.textContent.trim().includes(${JSON.stringify(text)})
      );
      if (!el) return false;
      el.click();
      return true;
    })()`,
  );
}

// Scrolls the button into view and re-measures until its viewport position
// stops moving. On the mobile-emulated viewport a scroll/reflow (font swap,
// smooth-scroll settling) can shift the page between measurement and the
// Input dispatch, landing the click on a neighboring element.
async function stableButtonRect(ws, text) {
  let previous = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rect = await evaluate(
      ws,
      `(() => {
        const el = [...document.querySelectorAll("button")].find((button) =>
          button.textContent.trim().includes(${JSON.stringify(text)})
        );
        if (!el) return null;
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      })()`,
    );
    if (!rect) {
      return null;
    }
    if (
      previous &&
      Math.abs(previous.x - rect.x) < 1 &&
      Math.abs(previous.y - rect.y) < 1
    ) {
      return rect;
    }
    previous = rect;
    await sleep(150);
  }
  return previous;
}

async function trustedClickText(ws, text) {
  const rect = await stableButtonRect(ws, text);
  if (!rect) {
    return false;
  }

  await send(ws, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: rect.x,
    y: rect.y,
    button: "left",
    clickCount: 1,
  });
  await send(ws, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: rect.x,
    y: rect.y,
    button: "left",
    clickCount: 1,
  });
  return true;
}

// Trusted touch tap — like trustedClickText, but via touch events. Under
// mobile device emulation (viewportWidth < 600) Edge sometimes drops
// synthetic mouse input while touch input lands; both carry the user
// activation the Web Audio sound check needs.
async function trustedTapText(ws, text) {
  const rect = await stableButtonRect(ws, text);
  if (!rect) {
    return false;
  }

  await send(ws, "Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: rect.x, y: rect.y }],
  });
  await send(ws, "Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  return true;
}

// Coordinate-free trusted activation: focus the button via JS, then send a
// trusted Enter keypress. A focused <button> activates natively on Enter, and
// the key event carries the user activation Web Audio needs — immune to the
// mobile-emulation coordinate/scroll drift that makes pointer input miss.
async function trustedPressEnterOnText(ws, text) {
  const focused = await evaluate(
    ws,
    `(() => {
      const el = [...document.querySelectorAll("button")].find((button) =>
        button.textContent.trim().includes(${JSON.stringify(text)})
      );
      if (!el) return false;
      el.focus();
      return document.activeElement === el;
    })()`,
  );
  if (!focused) {
    return false;
  }

  await send(ws, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    text: "\r",
  });
  await send(ws, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  return true;
}

async function setInputByLabel(ws, label, value) {
  return evaluate(
    ws,
    `(() => {
      const field = [...document.querySelectorAll("label")].find((labelEl) =>
        labelEl.textContent.trim().startsWith(${JSON.stringify(label)})
      );
      const input = field?.querySelector("input");
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`,
  );
}

async function submitCurrentForm(ws) {
  return evaluate(
    ws,
    `(() => {
      const button = document.querySelector("form button[type='submit']");
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
}

async function bodyText(ws) {
  return evaluate(ws, "document.body.innerText");
}

async function captureScreenshot(ws, name) {
  const path = `/tmp/${name}-${viewportLabel}.png`;
  const { data } = await send(ws, "Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(path, Buffer.from(data, "base64"));
  screenshots.push(path);
}

async function run() {
  const debuggerUrl = await getDebuggerUrl();
  const ws = new WebSocket(debuggerUrl);

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        item.reject(new Error(`${item.method}: ${message.error.message}`));
      } else {
        item.resolve(message.result ?? {});
      }
      return;
    }

    if (message.method === "Runtime.consoleAPICalled") {
      const text = message.params.args
          .map((arg) => arg.value ?? arg.description ?? "")
          .join(" ");
      consoleMessages.push(text);
      if (message.params.type === "error") {
        consoleErrors.push(text);
      }
    }

    if (message.method === "Network.requestWillBeSent") {
      const request = message.params.request;
      requestUrls.set(message.params.requestId, request.url);
      const meta = {
        requestId: message.params.requestId,
        url: request.url,
        method: request.method,
        authorization: request.headers?.Authorization ?? "",
        status: undefined,
      };
      requestMeta.set(message.params.requestId, meta);

      if (
        request.method === "POST" &&
        request.url.includes("/api/game/sessions")
      ) {
        sessionRequests.push({
          url: request.url,
          postData: request.postData ?? "",
          authorization: request.headers?.Authorization ?? "",
        });
      }

      if (
        request.url.includes("/api/game/") ||
        request.url.includes("/api/leaderboard")
      ) {
        protectedRequests.push(meta);
      }

      if (request.url.includes("/stimuli/")) {
        stimulusRequests.push(meta);
      }

      if (request.url.includes("/api/game/me/ratable-words")) {
        ratableWordsRequests.push(meta);
      }
    }

    if (message.method === "Network.requestWillBeSentExtraInfo") {
      const meta = requestMeta.get(message.params.requestId);
      if (meta && message.params.headers?.Authorization) {
        meta.authorization = message.params.headers.Authorization;
      }
    }

    if (message.method === "Network.responseReceived") {
      const meta = requestMeta.get(message.params.requestId);
      if (meta) {
        meta.status = message.params.response.status;
        if (
          meta.url.includes("/rounds/next") &&
          message.params.response.status === 200
        ) {
          roundFetches.push(meta);
        }
      }
    }

    if (message.method === "Network.loadingFailed") {
      failedRequests.push({
        url: requestUrls.get(message.params.requestId) ?? message.params.requestId,
        type: message.params.type,
        errorText: message.params.errorText,
      });
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  await send(ws, "Runtime.enable");
  await send(ws, "Page.enable");
  await send(ws, "Network.enable");
  await send(ws, "Log.enable");
  if (viewportWidth) {
    await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: viewportWidth,
      height: 812,
      deviceScaleFactor: 1,
      mobile: viewportWidth < 600,
    });
  }
  await send(ws, "Page.navigate", { url: baseUrl });
  await waitFor(
    () => evaluate(ws, "document.readyState === 'complete'"),
    "page load",
  );
  await evaluate(ws, "localStorage.clear()");
  await send(ws, "Page.reload");
  await waitFor(
    async () => (await bodyText(ws)).includes("Ideophone Arena"),
    "landing header",
  );

  // NIL-43: the logged-out entry is now the public landing, not the auth form.
  // Prove the landing rendered and does not scroll horizontally (§7 proof, both
  // viewports), then verify strip 7's honest six-mode grid before entering.
  await waitFor(async () => (await bodyText(ws)).includes("Prove it"), "landing hero");
  const landingText = await bodyText(ws);
  check(
    landingText.includes("get most of these right"),
    "Landing hero headline is missing",
  );
  const landingOverflow = await evaluate(
    ws,
    `(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))()`,
  );
  check(
    landingOverflow.scrollWidth <= landingOverflow.innerWidth,
    `Landing overflows horizontally: scrollWidth ${landingOverflow.scrollWidth} > ` +
      `innerWidth ${landingOverflow.innerWidth}`,
  );
  const landingComingSoon = await evaluate(
    ws,
    `(() => [...document.querySelectorAll('.landing-mode-card[aria-disabled="true"]')]
      .map((card) => card.textContent))()`,
  );
  // NIL-42 promoted Perception Ladder to a live LIVE_MODES card; the remaining
  // "In the works" cards are Word Mint / Word Anatomy / Polyglot Challenge (D3
  // renamed Cross-Linguistic → Polyglot Challenge).
  for (const mode of ["Word Mint", "Word Anatomy", "Polyglot Challenge"]) {
    check(
      landingComingSoon.some((text) => text.includes(mode)),
      `${mode} is not an honest coming-soon card on the landing`,
    );
  }
  const landingLive = await evaluate(
    ws,
    `(() => [...document.querySelectorAll("button.landing-mode-card")]
      .map((card) => card.textContent))()`,
  );
  for (const mode of ["Meaning Match", "Rating Lab", "Perception Ladder"]) {
    check(
      landingLive.some((text) => text.includes(mode)),
      `${mode} is not a live mode card on the landing`,
    );
  }

  // §7 waypoint: the hero CTA promises "a round", so it must land on Meaning
  // Match instructions post-auth — via the register tab, opened by default.
  await waitFor(() => clickText(ws, "Prove it"), "hero play CTA");
  await waitFor(
    async () => (await bodyText(ws)).includes("Email"),
    "register form (register tab is the hero default)",
  );
  await setInputByLabel(ws, "Username", username);
  await setInputByLabel(ws, "Email", email);
  await setInputByLabel(ws, "Password", password);
  if (!(await submitCurrentForm(ws))) {
    throw new Error("Register submit not found");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Meaning Match Instructions"),
    "Meaning Match instructions after the hero CTA",
  );

  // ModeSelect coverage: the hero path skips the home grid, so reach it via the
  // instructions "Back to modes" button and assert the six-mode home shell.
  if (!(await clickText(ws, "Back to modes"))) {
    throw new Error("'Back to modes' button not found on the instructions screen");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Choose a mode"),
    "mode select home",
  );
  const comingSoonModes = await evaluate(
    ws,
    `(() => [...document.querySelectorAll("button.mode-card:disabled")]
      .map((button) => button.textContent))()`,
  );
  // NIL-42 promoted Perception Ladder to available, so the home grid (MODES) is
  // now three live cards with no coming-soon stubs — assert none are disabled.
  check(
    comingSoonModes.length === 0,
    `Home grid should have no coming-soon modes, saw: ${comingSoonModes.join(", ")}`,
  );
  const enabledModes = await evaluate(
    ws,
    `(() => [...document.querySelectorAll("button.mode-card:not(:disabled)")]
      .map((button) => button.textContent))()`,
  );
  for (const mode of ["Meaning Match", "Rating Lab", "Perception Ladder"]) {
    check(
      enabledModes.some((text) => text.includes(mode)),
      `${mode} is not shown as an enabled mode card`,
    );
  }
  if (!(await clickText(ws, "Meaning Match"))) {
    throw new Error("Meaning Match mode card not found");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Meaning Match Instructions"),
    "instructions after mode select",
  );
  await assertScriptLabSelector(ws);
  await assertPracticeToggle(ws);
  // The sound check needs trusted input for Web Audio user activation. Under
  // mobile emulation synthetic mouse clicks sometimes never land (known
  // environment flake), so retry, alternating mouse and touch input.
  let soundCheckPassed = false;
  const soundCheckMethods = [
    trustedPressEnterOnText,
    trustedClickText,
    trustedTapText,
    trustedPressEnterOnText,
  ];
  for (
    let attempt = 0;
    attempt < soundCheckMethods.length && !soundCheckPassed;
    attempt += 1
  ) {
    const clicked = await soundCheckMethods[attempt](ws, "Sound check");
    if (!clicked) {
      throw new Error("Sound check button not found");
    }
    soundCheckPassed = await waitFor(
      async () => (await bodyText(ws)).includes("Sound check passed."),
      "sound check to pass",
      8000,
    ).then(
      () => true,
      () => false,
    );
  }
  if (!soundCheckPassed) {
    const soundCheckState = await evaluate(
      ws,
      `document.querySelector(".sound-check")?.innerText ?? "(sound-check panel missing)"`,
    );
    throw new Error(
      `Sound check did not pass after mouse and touch retries. Panel: ${soundCheckState}`,
    );
  }
  if (!(await clickText(ws, "Start Game"))) {
    throw new Error("Start Game button not found");
  }

  // Install before the first round mounts so round 1 yields one geometry
  // sample for each of the five phases.
  await installGeometrySampler(ws);

  await waitForSessionRequest();

  const sessionBody = sessionRequests[0]?.postData ?? "";
  check(
    sessionBody.includes('"conditionName":"CONDITION_1_SOKUON"'),
    `Default session request did not send CONDITION_1_SOKUON: ${sessionBody}`,
  );
  // The UI default is practice ON and the flag must be sent explicitly
  // (the backend default is false).
  check(
    sessionBody.includes('"includePractice":true'),
    `Session request did not send includePractice true: ${sessionBody}`,
  );

  const answeredRounds = [];
  let completed = false;

  // Runaway guard, not an expectation: a session serves 47 scored rounds (NIL-60,
  // was 30) plus 2 practice when the toggle is on.
  const maxRounds = 60;
  for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
    const text = await bodyText(ws);
    if (text.includes("Session complete")) {
      completed = true;
      break;
    }

    const proof = await answerCurrentRound(ws, roundNumber === 1);
    if (proof.completed) {
      completed = true;
      break;
    }
    answeredRounds.push(proof);

    const nextState = await waitFor(
      async () => {
        const nextText = await bodyText(ws);
        if (nextText.includes("Session complete")) {
          return "complete";
        }
        if (
          nextText.includes("+") ||
          nextText.includes("Listen to these two Japanese words.") ||
          nextText.includes("Which one do you think means")
        ) {
          return "next-round";
        }
        return "";
      },
      "completion or next round",
      45000,
    );

    if (nextState === "complete") {
      completed = true;
      break;
    }
  }

  if (!completed) {
    throw new Error(`Session did not reach completion within ${maxRounds} answered rounds`);
  }

  // Practice sequencing: the toggle stayed ON, so exactly the first 2 rounds
  // are practice and the first scored round starts at Round 1 with the score
  // still at its pre-game 0 / 0. The scored total is not pinned here -- the
  // backend seed tests own it, and it moved 30 -> 47 with NIL-60.
  const practiceRounds = answeredRounds.filter((round) => round.practice);
  check(
    practiceRounds.length === 2,
    `Expected exactly 2 practice rounds, observed ${practiceRounds.length}`,
  );
  check(
    answeredRounds[0]?.practice && answeredRounds[1]?.practice,
    "Practice rounds were not served first",
  );
  check(
    !answeredRounds.slice(2).some((round) => round.practice),
    "A practice round appeared after the scored rounds began",
  );
  const firstScoredRound = answeredRounds[2];
  check(
    firstScoredRound?.progressText?.includes("Round 1 / ") &&
      firstScoredRound.progressText.includes("Session score: 0 / 0"),
    `First scored round did not start at Round 1 with score 0 / 0: ` +
      `${firstScoredRound?.progressText ?? "missing"}`,
  );

  // The denominator the UI shows must be the number of scored rounds actually served.
  // Asserted as a relationship, never as a literal: App.tsx once pinned it to 30 while
  // the backend served 47, which froze the counter at "Round 30 / 30" and pegged the
  // progress bar at 100% for the last 17 rounds -- invisible to a literal check on
  // round 1, the one round where the wrong total still reads correctly.
  const scoredRounds = answeredRounds.filter((round) => !round.practice);
  const declaredTotal = Number(
    /Round\s+\d+\s*\/\s*(\d+)/.exec(firstScoredRound?.progressText ?? "")?.[1],
  );
  check(
    declaredTotal === scoredRounds.length,
    `Progress denominator ${declaredTotal} does not match the ` +
      `${scoredRounds.length} scored rounds the session served`,
  );

  // Every answered round passed the per-round flag assertion above; across
  // ~32 seed draws both orders must also appear (a one-sided run has chance
  // ~2^-31, so a miss means the flag is ignored or constant).
  const targetFirstCount = meaningOrderRounds.filter(
    (round) => round.targetMeaningListedFirst,
  ).length;
  const otherFirstCount = meaningOrderRounds.length - targetFirstCount;
  check(
    targetFirstCount > 0 && otherFirstCount > 0,
    `Both meaning-line orders should appear across ${meaningOrderRounds.length} ` +
      `seed draws; saw targetFirst=${targetFirstCount}, otherFirst=${otherFirstCount}`,
  );
  check(
    roundRefetchProof?.stable,
    "The round-refetch determinism probe never ran",
  );

  await waitFor(
    async () => (await bodyText(ws)).includes("Session complete"),
    "completion screen remains visible",
  );

  const finalText = await bodyText(ws);
  if (!finalText.includes("Leaderboard")) {
    throw new Error("Leaderboard is not visible after completion");
  }

  const leaderboardProof = await verifyLeaderboard(ws);

  // shadcn (Radix) Tabs trigger — activate with focus+Enter, as above.
  if (!(await trustedPressEnterOnText(ws, "Recent attempts"))) {
    throw new Error("Recent attempts tab is not clickable after completion");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Recent Attempts"),
    "recent attempts panel",
  );
  const attemptsText = await bodyText(ws);

  // 27D Rating Lab waypoint: completion CTA → frozen instructions → rate one
  // word on the 1-7 scale → arena-record reveal. The run registers a fresh
  // user, so every pool word is unrated and the first submit must succeed.
  if (!(await clickText(ws, "Rate these words"))) {
    throw new Error("'Rate these words' CTA not found on the completion panel");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("In this task, you will rate"),
    "rating lab instructions",
  );

  // 27E: the pool must be sourced from the backend, never from the retired
  // localStorage pool — assert the network call happened and the legacy key
  // was never written.
  check(
    ratableWordsRequests.length > 0,
    "Rating Lab opened without requesting GET /api/game/me/ratable-words",
  );
  const ratableWordsFailures = ratableWordsRequests.filter(
    (request) => !request.status || request.status >= 400,
  );
  check(
    ratableWordsFailures.length === 0,
    `ratable-words requests failed: ${JSON.stringify(ratableWordsFailures)}`,
  );
  const legacyPoolValue = await evaluate(
    ws,
    `localStorage.getItem("ideophone-arena-rating-pool")`,
  );
  check(
    legacyPoolValue === null,
    "The retired ideophone-arena-rating-pool localStorage key was written",
  );
  const instructionsText = await bodyText(ws);
  const wordCountMatch = instructionsText.match(/you will rate (\d+) words/);
  check(
    wordCountMatch !== null,
    `Rating instructions did not state a word count: ${instructionsText.slice(0, 200)}`,
  );
  const instructionsWordCount = wordCountMatch ? Number(wordCountMatch[1]) : NaN;
  // Rebuild the pool the browser received from the captured response bodies,
  // deduplicating by page number (a dev-mode double effect refetches the
  // same pages with identical bodies).
  const poolPageBodies = new Map();
  for (const request of ratableWordsRequests) {
    const pageMatch = request.url.match(/[?&]page=(\d+)/);
    const pageNumber = pageMatch ? Number(pageMatch[1]) : 0;
    if (!poolPageBodies.has(pageNumber)) {
      poolPageBodies.set(
        pageNumber,
        await getJsonResponseBody(ws, request.requestId, "ratable-words"),
      );
    }
  }
  const browserPoolIds = [...poolPageBodies.keys()]
    .sort((a, b) => a - b)
    .flatMap((page) =>
      (poolPageBodies.get(page).entries ?? []).map((entry) => entry.ideophoneId),
    );
  // A fresh user has rated nothing, so the queue equals the served pool.
  check(
    browserPoolIds.length === instructionsWordCount,
    `Instructions count ${instructionsWordCount} does not match the served ` +
      `pool size ${browserPoolIds.length}`,
  );

  if (!(await clickText(ws, "Start rating"))) {
    throw new Error("Start rating button not found");
  }
  await waitFor(
    async () =>
      (await bodyText(ws)).includes(
        "Do you think there is a resemblance between the word and its meaning?",
      ),
    "rating trial question",
  );
  const ratingScaleShape = await evaluate(
    ws,
    `(() => {
      const buttons = [...document.querySelectorAll(".rating-scale-button")];
      return {
        count: buttons.length,
        enabled: buttons.filter((button) => !button.disabled).length,
      };
    })()`,
  );
  if (ratingScaleShape.count !== 7 || ratingScaleShape.enabled !== 7) {
    throw new Error(
      `Rating scale should offer 7 enabled buttons, saw ${JSON.stringify(ratingScaleShape)}`,
    );
  }
  const ratingSelected = await evaluate(
    ws,
    `(() => {
      const button = [...document.querySelectorAll(".rating-scale-button")]
        .find((candidate) => candidate.textContent.trim() === "4");
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  if (!ratingSelected) {
    throw new Error("Rating scale button 4 not found");
  }
  await waitFor(
    async () =>
      await evaluate(
        ws,
        `document.querySelectorAll(".rating-scale-button.selected").length === 1`,
      ),
    "scale selection to register",
  );
  const nextClicked = await evaluate(
    ws,
    `(() => {
      const button = document.querySelector(".rating-next-button");
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`,
  );
  if (!nextClicked) {
    throw new Error("Rating Next button not clickable after selection");
  }
  // The reveal label is CSS-uppercased, so innerText reads "ARENA RECORD" —
  // match case-insensitively.
  await waitFor(
    async () => /arena record/i.test(await bodyText(ws)),
    "arena record reveal after rating submit",
    15000,
  );
  const ratingRevealText = await bodyText(ws);
  if (!ratingRevealText.includes("Your rating:")) {
    throw new Error("Reveal did not confirm the submitted rating");
  }
  const ratingProof = {
    scale: ratingScaleShape,
    revealVisible: /arena record/i.test(ratingRevealText),
    ratingConfirmed: ratingRevealText.includes("Your rating:"),
  };

  // 27E pool parity: a completely fresh client (this Node process — no
  // browser state, no localStorage) logs into the same account and must see
  // the identical pool, minus the first pool word the waypoint just rated.
  // Pure Node HTTP, no DOM: a failure here cannot disturb the checks that follow.
  const poolParityProof = await runStage("pool parity", () =>
    verifyPoolParity(browserPoolIds),
  );

  // Perception Ladder (NIL-42): mode grid → floor stack → floor-intro Dialog →
  // play a floor to completion, in the same authenticated session. The last stage that
  // drives the UI, so the live-DOM checks below are conditional on it having finished.
  const ladderProof = await runStage(
    "perception ladder",
    () => verifyPerceptionLadder(ws),
    { navigates: true },
  );

  check(
    stimulusRequests.length > 0,
    "No /stimuli/ media requests were observed",
  );
  const stimulusSuccessCount = stimulusRequests.filter(
    (request) => request.status && request.status < 400,
  ).length;
  check(
    stimulusSuccessCount > 0,
    "No successful /stimuli/ media responses were observed",
  );
  // Live-DOM checks: meaningful only if the stages above left the app where they should.
  let mutedStimulusCount = null;
  let staleControls = null;
  if (domStateTrusted) {
    mutedStimulusCount = await evaluate(
      ws,
      `(() => [...document.querySelectorAll(".stimulus-media")]
        .filter((media) => media.muted || media.defaultMuted || media.volume === 0)
        .length)()`,
    );
    check(
      mutedStimulusCount === 0,
      `Muted stimulus media elements are present: ${mutedStimulusCount}`,
    );

    staleControls = await evaluate(
      ws,
      `(() => [...document.querySelectorAll("input, select, textarea")]
        .map((control) => [
          control.getAttribute("aria-label"),
          control.getAttribute("name"),
          control.getAttribute("id"),
          control.closest("label")?.textContent
        ].filter(Boolean).join(" "))
        .filter((text) => /difficulty|condition/i.test(text)))()`,
    );
    check(
      !Array.isArray(staleControls) || staleControls.length === 0,
      `Stale condition/difficulty controls are visible: ${(staleControls ?? []).join(", ")}`,
    );
  }

  const hasBearerRequest = protectedRequests.some((request) =>
    /^Bearer\s+\S+/.test(request.authorization),
  );
  const protectedSuccessCount = protectedRequests.filter((request) => {
    const isProtectedPath = request.url.includes("/api/game/");
    return isProtectedPath && request.status && request.status < 400;
  }).length;
  check(
    hasBearerRequest || protectedSuccessCount > 0,
    "No protected API request showed a bearer token or successful protected response",
  );
  const relevantConsoleErrors = consoleErrors.filter(
    (message) => !message.includes("Download the React DevTools"),
  );
  check(
    relevantConsoleErrors.length === 0,
    `Browser console errors were observed: ${relevantConsoleErrors.join(" | ")}`,
  );

  const phaseGeometry = await evaluate(ws, "window.__phaseGeometry ?? null");
  assertGeometryStable(phaseGeometry);

  // Narrow-viewport audit: the document must not overflow horizontally. Measured on the
  // view the run was meant to end on, so it is skipped when a stage left that in doubt.
  let overflowProof = null;
  if (domStateTrusted) {
    overflowProof = await evaluate(
      ws,
      `(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))()`,
    );
    check(
      overflowProof.scrollWidth <= overflowProof.innerWidth,
      `Horizontal overflow: scrollWidth ${overflowProof.scrollWidth} > ` +
        `innerWidth ${overflowProof.innerWidth}`,
    );
  }

  const relevantFailures = failedRequests.filter(
    (request) =>
      !request.url.includes("/@vite/") &&
      !request.url.includes("/@react-refresh") &&
      !request.url.includes("vite.svg"),
  );

  console.log(
    JSON.stringify(
      {
        username,
        viewportWidth: viewportWidth ?? "desktop default",
        phaseGeometry,
        answeredRoundCount: answeredRounds.length,
        practiceRoundCount: practiceRounds.length,
        firstPracticeRound: answeredRounds[0],
        firstScoredRound,
        sessionRequest: sessionRequests[0],
        completionVisible: completed,
        leaderboardVisible: finalText.includes("Leaderboard"),
        leaderboard: leaderboardProof,
        overflowProof,
        screenshots,
        recentAttemptsVisible: attemptsText.includes("Recent Attempts"),
        ratingProof,
        ladderProof,
        meaningOrderProof: {
          assertedRoundCount: meaningOrderRounds.length,
          targetFirstCount,
          otherFirstCount,
          refetch: roundRefetchProof,
        },
        ratablePoolProof: {
          requestCount: ratableWordsRequests.length,
          legacyPoolKeyAbsent: legacyPoolValue === null,
          instructionsWordCount,
          parity: poolParityProof,
        },
        domStateTrusted,
        staleControlCount: Array.isArray(staleControls)
          ? staleControls.length
          : null,
        mutedStimulusCount,
        stimulusRequestCount: stimulusRequests.length,
        stimulusSuccessCount,
        bearerRequestCount: protectedRequests.filter((request) =>
          /^Bearer\s+\S+/.test(request.authorization),
        ).length,
        protectedSuccessCount,
        failedRequestCount: failedRequests.length,
        relevantFailedRequestCount: relevantFailures.length,
        relevantFailures,
        relevantConsoleErrorCount: relevantConsoleErrors.length,
        assertionFailureCount: assertionFailures.length,
        assertionFailures,
        consoleMessages: consoleMessages.slice(0, 5),
      },
      null,
      2,
    ),
  );
  ws.close();
}

run()
  .then(() => {
    // Verdict failures do not abort the run, so the exit code is decided here.
    if (assertionFailures.length > 0) {
      reportAssertionFailures();
      process.exit(1);
    }
  })
  .catch(async (error) => {
    // A hard failure (navigation, timeout, prerequisite) stops the run, but whatever
    // verdicts were already collected still get reported -- they are real findings.
    console.error(error);
    reportAssertionFailures();
    process.exit(1);
  });

// Records each phase's first bounding boxes (document coordinates) for the
// trial stage, the reserved board, and both card slots. Phases are detected
// from the same visibility toggles the UI uses; the rAF loop stops once all
// five phases have a sample (all within round 1, since phases are sequential).
async function installGeometrySampler(ws) {
  await evaluate(
    ws,
    `(() => {
      if (window.__phaseGeometry) return true;
      window.__phaseGeometry = {};
      const toBox = (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x + scrollX),
          y: Math.round(r.y + scrollY),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      };
      const isVisible = (el) =>
        Boolean(el) && getComputedStyle(el).visibility !== "hidden";
      const sample = () => {
        const stage = document.querySelector(".trial-stage");
        const board = document.querySelector(".trial-board");
        const questionSlot = document.querySelector(".question-slot");
        const nextButton = document.querySelector(".feedback-next-button");
        const cards = document.querySelectorAll(".stimulus-row .ideophone-card");
        if (stage && board && questionSlot && nextButton && cards.length === 2) {
          const [cardA, cardB] = cards;
          const cardAVisible = !cardA.classList.contains("empty");
          const cardBVisible = !cardB.classList.contains("empty");
          let phase = "";
          if (document.querySelector(".feedback")) phase = "feedback";
          else if (isVisible(document.querySelector(".question-text"))) phase = "choice";
          else if (isVisible(document.querySelector(".fixation-cross"))) phase = "fixation";
          else if (cardAVisible && !cardBVisible) phase = "left-playing";
          else if (cardBVisible && !cardAVisible) phase = "right-playing";
          if (phase && !window.__phaseGeometry[phase]) {
            window.__phaseGeometry[phase] = {
              stage: toBox(stage),
              board: toBox(board),
              cardA: toBox(cardA),
              cardB: toBox(cardB),
              questionSlot: toBox(questionSlot),
              nextButton: toBox(nextButton),
              nextButtonVisible: isVisible(nextButton),
            };
          }
        }
        if (Object.keys(window.__phaseGeometry).length < 5) {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
      return true;
    })()`,
  );
}

// Invariant 5: phase changes toggle visibility only, never document flow. The
// board and both card slots must hold one box across all five phases; the
// stage may only extend downward at feedback (the feedback panel and Next
// round button append below the board). Tolerance of 2px absorbs sub-pixel
// rounding in getBoundingClientRect.
const GEOMETRY_TOLERANCE_PX = 2;

function assertGeometryStable(geometry) {
  const phases = ["fixation", "left-playing", "right-playing", "choice", "feedback"];
  const missing = phases.filter((phase) => !geometry?.[phase]);
  // Without every phase sampled there is nothing to compare against, so this one
  // gates the rest of the function rather than merely being recorded.
  if (!check(missing.length === 0, `Geometry sampler missed phases: ${missing.join(", ")}`)) {
    return;
  }

  const reference = geometry.fixation;
  for (const phase of phases) {
    for (const slot of ["board", "cardA", "cardB", "questionSlot"]) {
      for (const prop of ["x", "y", "width", "height"]) {
        const delta = Math.abs(geometry[phase][slot][prop] - reference[slot][prop]);
        check(
          delta <= GEOMETRY_TOLERANCE_PX,
          `Layout shift: ${slot}.${prop} moved ${delta}px between fixation and ${phase} ` +
            `(${reference[slot][prop]} -> ${geometry[phase][slot][prop]})`,
        );
      }
    }

    for (const prop of ["x", "y", "width"]) {
      const delta = Math.abs(geometry[phase].stage[prop] - reference.stage[prop]);
      check(
        delta <= GEOMETRY_TOLERANCE_PX,
        `Layout shift: stage.${prop} moved ${delta}px between fixation and ${phase}`,
      );
    }
    const heightDelta = geometry[phase].stage.height - reference.stage.height;
    if (phase !== "feedback") {
      check(
        Math.abs(heightDelta) <= GEOMETRY_TOLERANCE_PX,
        `Layout shift: stage.height changed ${heightDelta}px between fixation and ${phase}`,
      );
    }
    if (phase === "feedback") {
      check(
        heightDelta >= -GEOMETRY_TOLERANCE_PX,
        `Layout shift: stage shrank ${heightDelta}px at feedback`,
      );
    }

    // The Next round button lives inside the reserved question slot: visible
    // only at feedback, and its box must sit within the slot's box so its
    // appearance cannot move anything.
    check(
      geometry[phase].nextButtonVisible === (phase === "feedback"),
      `Next round button visibility is wrong at ${phase}: ` +
        `${geometry[phase].nextButtonVisible}`,
    );
    if (phase === "feedback") {
      const slot = geometry[phase].questionSlot;
      const button = geometry[phase].nextButton;
      const fitsSlot =
        button.x >= slot.x - GEOMETRY_TOLERANCE_PX &&
        button.y >= slot.y - GEOMETRY_TOLERANCE_PX &&
        button.x + button.width <= slot.x + slot.width + GEOMETRY_TOLERANCE_PX &&
        button.y + button.height <= slot.y + slot.height + GEOMETRY_TOLERANCE_PX;
      check(
        fitsSlot,
        `Next round button is not inside the reserved question slot at feedback: ` +
          `button ${JSON.stringify(button)} vs slot ${JSON.stringify(slot)}`,
      );
    }
  }
}

// Paginated leaderboard (contract change 2026-06-11): entries must render as
// table rows; the pager appears only when the backend reports totalPages > 1,
// and Next/Previous must actually change the page indicator.
async function verifyLeaderboard(ws) {
  await waitFor(
    () =>
      evaluate(
        ws,
        `(() => {
          const panel = document.querySelector("#leaderboard-panel");
          if (!panel) return false;
          return panel.querySelectorAll("tbody tr").length > 0;
        })()`,
      ),
    "leaderboard entries",
  );

  const readState = () =>
    evaluate(
      ws,
      `(() => {
        const panel = document.querySelector("#leaderboard-panel");
        const pager = panel?.querySelector(".leaderboard-pager");
        return {
          rowCount: panel?.querySelectorAll("tbody tr").length ?? 0,
          firstRow: panel?.querySelector("tbody tr")?.innerText.trim() ?? "",
          pagerVisible: Boolean(pager),
          pagerText: pager?.querySelector("span")?.innerText.trim() ?? "",
          previousDisabled: pager
            ? [...pager.querySelectorAll("button")].find((b) =>
                b.textContent.includes("Previous"))?.disabled ?? null
            : null,
        };
      })()`,
    );

  const initialState = await readState();
  if (initialState.rowCount === 0) {
    throw new Error("Leaderboard rendered no entries after completion");
  }

  // The leaderboard table (long usernames) must not widen the page; the
  // end-of-run overflow check no longer sees this tab, so assert here too.
  const leaderboardOverflow = await evaluate(
    ws,
    `(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))()`,
  );
  if (leaderboardOverflow.scrollWidth > leaderboardOverflow.innerWidth) {
    throw new Error(
      `Horizontal overflow on the leaderboard view: scrollWidth ` +
        `${leaderboardOverflow.scrollWidth} > innerWidth ${leaderboardOverflow.innerWidth}`,
    );
  }

  await captureScreenshot(ws, "leaderboard");

  let pagination = null;
  if (initialState.pagerVisible) {
    if (!initialState.pagerText.startsWith("page 1 of")) {
      throw new Error(
        `Leaderboard pager did not start on page 1: "${initialState.pagerText}"`,
      );
    }
    if (initialState.previousDisabled !== true) {
      throw new Error("Leaderboard Previous button should be disabled on page 1");
    }
    if (!(await clickText(ws, "Next"))) {
      throw new Error("Leaderboard Next button not clickable");
    }
    const pageTwo = await waitFor(async () => {
      const state = await readState();
      return state.pagerText.startsWith("page 2 of") ? state : null;
    }, "leaderboard page 2");
    if (pageTwo.firstRow === initialState.firstRow) {
      throw new Error("Leaderboard page 2 shows the same first entry as page 1");
    }
    await captureScreenshot(ws, "leaderboard-page-2");
    if (!(await clickText(ws, "Previous"))) {
      throw new Error("Leaderboard Previous button not clickable");
    }
    await waitFor(async () => {
      const state = await readState();
      return state.pagerText.startsWith("page 1 of") ? state : null;
    }, "leaderboard back to page 1");
    pagination = { pageOneFirstRow: initialState.firstRow, pageTwoFirstRow: pageTwo.firstRow };
  }

  return {
    rowCount: initialState.rowCount,
    pagerVisible: initialState.pagerVisible,
    pagerText: initialState.pagerText,
    pagination,
  };
}

async function waitForSessionRequest() {
  await waitFor(
    () => sessionRequests.length > 0,
    "POST /api/game/sessions request",
  );
}

async function assertScriptLabSelector(ws) {
  const selectorProof = await evaluate(
    ws,
    `(() => {
      const text = document.body.innerText;
      const controls = [...document.querySelectorAll("button, input, select, textarea")];
      return {
        hasAudioOnly: text.includes("Audio only"),
        hasScriptMatch: text.includes("Script match"),
        hasScriptMismatch: text.includes("Script mismatch"),
        hasTextOnly: text.includes("TEXT_ONLY"),
        visibleEnumName: /CONDITION_[0-9]+_SOKUON/.test(text),
        difficultyControls: controls
          .map((control) => [
            control.textContent,
            control.getAttribute("aria-label"),
            control.getAttribute("name"),
            control.getAttribute("id"),
            control.closest("label")?.textContent
          ].filter(Boolean).join(" "))
          .filter((label) => /difficulty/i.test(label)),
        activeLabel: [...document.querySelectorAll("button[aria-pressed='true']")]
          .map((button) => button.textContent.trim())
          .find((label) =>
            label.includes("Audio only") ||
            label.includes("Script match") ||
            label.includes("Script mismatch")
          ) ?? "",
      };
    })()`,
  );

  if (!selectorProof.hasAudioOnly) {
    throw new Error("Script Lab selector is missing Audio only");
  }
  if (!selectorProof.hasScriptMatch) {
    throw new Error("Script Lab selector is missing Script match");
  }
  if (!selectorProof.hasScriptMismatch) {
    throw new Error("Script Lab selector is missing Script mismatch");
  }
  if (selectorProof.hasTextOnly) {
    throw new Error("Script Lab selector exposed TEXT_ONLY");
  }
  if (selectorProof.visibleEnumName) {
    throw new Error("Script Lab selector exposed backend enum names in visible text");
  }
  if (
    Array.isArray(selectorProof.difficultyControls) &&
    selectorProof.difficultyControls.length > 0
  ) {
    throw new Error(
      `Difficulty controls are visible: ${selectorProof.difficultyControls.join(", ")}`,
    );
  }
  if (!selectorProof.activeLabel.includes("Audio only")) {
    throw new Error(
      `Default Script Lab option should be Audio only: ${selectorProof.activeLabel}`,
    );
  }

  for (const label of ["Script match", "Script mismatch", "Audio only"]) {
    if (!(await clickText(ws, label))) {
      throw new Error(`Could not select Script Lab option: ${label}`);
    }
    await waitFor(
      () =>
        evaluate(
          ws,
          `(() => [...document.querySelectorAll("button[aria-pressed='true']")]
            .some((button) => button.textContent.includes(${JSON.stringify(label)})))()`,
        ),
      `Script Lab option ${label} selected`,
    );
  }
}

// The practice toggle (2026-06-12) sits in the Script Lab section, defaults
// to checked, and must use player-facing wording only.
async function assertPracticeToggle(ws) {
  const toggleProof = await evaluate(
    ws,
    `(() => {
      const label = [...document.querySelectorAll("label")].find((candidate) =>
        candidate.textContent.includes("practice")
      );
      const checkbox = label?.querySelector("input[type='checkbox']");
      if (!checkbox) return null;
      return {
        labelText: label.textContent.trim(),
        checked: checkbox.checked,
        insideScriptLab: Boolean(label.closest(".script-lab-selector")),
      };
    })()`,
  );

  if (!toggleProof) {
    throw new Error("Practice toggle checkbox not found on the instructions screen");
  }
  if (!toggleProof.labelText.includes("Include 2 practice rounds (not scored)")) {
    throw new Error(`Practice toggle label is wrong: "${toggleProof.labelText}"`);
  }
  if (!toggleProof.checked) {
    throw new Error("Practice toggle should default to checked");
  }
  if (!toggleProof.insideScriptLab) {
    throw new Error("Practice toggle is not near the Script Lab selector");
  }
}

// Reads a captured response body via CDP; JSON bodies are only evictable, not
// streamed, so a short retry covers the responseReceived -> body-ready gap.
async function getJsonResponseBody(ws, requestId, label) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const { body, base64Encoded } = await send(ws, "Network.getResponseBody", {
        requestId,
      });
      const text = base64Encoded
        ? Buffer.from(body, "base64").toString("utf8")
        : body;
      return JSON.parse(text);
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Could not read the ${label} response body`);
}

// 27E meaning-order assertion: the round payload the app just fetched is the
// ground truth; the payload is bound to the on-screen round via the question
// gloss, then the two meaning lines must place the glosses per the flag. The
// frozen prefixes never move — only the glosses swap.
async function assertMeaningLineOrder(ws, questionText) {
  const lastFetch = roundFetches[roundFetches.length - 1];
  if (!lastFetch) {
    throw new Error("No rounds/next response was captured for the current round");
  }
  const payload = await getJsonResponseBody(ws, lastFetch.requestId, "rounds/next");
  if (payload.completed === true) {
    throw new Error("Latest rounds/next payload is a completion sentinel mid-round");
  }
  if (typeof payload.targetMeaningListedFirst !== "boolean") {
    throw new Error(
      "Round payload is missing the targetMeaningListedFirst boolean (stale backend?)",
    );
  }
  const targetGloss = payload.translations?.target ?? "";
  const otherGloss = payload.translations?.other ?? "";
  if (!targetGloss || !otherGloss) {
    throw new Error(
      `Round payload is missing translations: ${JSON.stringify(payload.translations)}`,
    );
  }
  if (!questionText.includes(targetGloss)) {
    throw new Error(
      `Captured payload (target "${targetGloss}") does not match the displayed ` +
        `question: "${questionText}"`,
    );
  }

  const lines = await evaluate(
    ws,
    `(() => [...document.querySelectorAll(".translation-lines .translation-option")]
      .map((line) => line.innerText.trim()))()`,
  );
  if (!Array.isArray(lines) || lines.length !== 2) {
    throw new Error(
      `Expected 2 meaning lines, found ${Array.isArray(lines) ? lines.length : "none"}`,
    );
  }
  const firstGloss = payload.targetMeaningListedFirst ? targetGloss : otherGloss;
  const secondGloss = payload.targetMeaningListedFirst ? otherGloss : targetGloss;
  const expected = [
    `One of them means ${firstGloss}`,
    `The other means ${secondGloss}`,
  ];
  if (lines[0] !== expected[0] || lines[1] !== expected[1]) {
    throw new Error(
      `Meaning lines do not follow targetMeaningListedFirst=` +
        `${payload.targetMeaningListedFirst}: saw ${JSON.stringify(lines)}, ` +
        `expected ${JSON.stringify(expected)}`,
    );
  }

  const proof = {
    roundId: payload.roundId,
    targetMeaningListedFirst: payload.targetMeaningListedFirst,
    firstLine: lines[0],
  };
  meaningOrderRounds.push(proof);

  // Once per run: refetching the same unanswered round must reproduce the
  // draw (the derivation is recomputed from the seed per request), which is
  // what makes the order stable across a reload.
  if (!roundRefetchProof) {
    roundRefetchProof = await probeRoundRefetch(ws, lastFetch.url, payload);
  }
  return proof;
}

async function probeRoundRefetch(ws, url, payload) {
  const probes = await evaluate(
    ws,
    `(async () => {
      const token = localStorage.getItem("ideophone-arena-token");
      const results = [];
      for (let i = 0; i < 2; i += 1) {
        const response = await fetch(${JSON.stringify(url)}, {
          headers: { Authorization: "Bearer " + token },
        });
        const body = await response.json();
        results.push({
          roundId: body.roundId,
          targetMeaningListedFirst: body.targetMeaningListedFirst,
        });
      }
      return results;
    })()`,
  );
  for (const probe of probes) {
    if (
      probe.roundId !== payload.roundId ||
      probe.targetMeaningListedFirst !== payload.targetMeaningListedFirst
    ) {
      throw new Error(
        `Refetching the current round changed the meaning-order draw: ` +
          `${JSON.stringify(probes)} vs roundId ${payload.roundId} ` +
          `flag ${payload.targetMeaningListedFirst}`,
      );
    }
  }
  return { url, probes, stable: true };
}

async function verifyPoolParity(browserPoolIds) {
  const loginResponse = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!loginResponse.ok) {
    throw new Error(`Pool-parity login failed: ${loginResponse.status}`);
  }
  const { token } = await loginResponse.json();

  const fetchPoolIds = async () => {
    const ids = [];
    let page = 0;
    let totalPages = 1;
    while (page < totalPages && page < 40) {
      const response = await fetch(
        `${apiBaseUrl}/api/game/me/ratable-words?page=${page}&size=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        throw new Error(`Pool-parity fetch failed: ${response.status}`);
      }
      const body = await response.json();
      ids.push(...(body.entries ?? []).map((entry) => entry.ideophoneId));
      totalPages = body.totalPages ?? 0;
      page += 1;
    }
    return ids;
  };

  const firstFetch = await fetchPoolIds();
  const secondFetch = await fetchPoolIds();
  if (JSON.stringify(firstFetch) !== JSON.stringify(secondFetch)) {
    throw new Error("Ratable pool order changed between two fresh-client fetches");
  }
  // The waypoint rated the first pool word (queue[0] of a fresh user), so the
  // fresh client must see exactly the rest, in the same order.
  const expected = browserPoolIds.slice(1);
  if (JSON.stringify(firstFetch) !== JSON.stringify(expected)) {
    throw new Error(
      `Fresh-client pool does not equal the browser pool minus the rated word: ` +
        `fresh has ${firstFetch.length} ids, expected ${expected.length}; ` +
        `first mismatch at index ${firstFetch.findIndex((id, i) => id !== expected[i])}`,
    );
  }
  return {
    browserPoolSize: browserPoolIds.length,
    freshClientPoolSize: firstFetch.length,
    orderStableAcrossFetches: true,
    matchesBrowserMinusRated: true,
  };
}

async function answerCurrentRound(ws, expectFixation) {
  if (expectFixation) {
    await waitFor(
      async () => (await bodyText(ws)).includes("+"),
      "fixation cross",
    );
  }

  const choiceState = await waitFor(
    async () => {
      const text = await bodyText(ws);
      if (text.includes("Session complete")) {
        return "complete";
      }
      return text.includes("Which one do you think means") ? "choice" : "";
    },
    "choice phase",
    45000,
  );
  if (choiceState === "complete") {
    return { completed: true };
  }

  const choices = await evaluate(
    ws,
    `(() => [...document.querySelectorAll(".stimulus-row .choice-button")].map((button) =>
      (button.getAttribute("aria-label") ?? button.textContent).trim()
    ))()`,
  );
  if (!Array.isArray(choices) || choices.length !== 2) {
    throw new Error(`Expected 2 ideophone choices, found ${choices.length}`);
  }
  // Invariant 7: pre-feedback card labels identify position only.
  for (const label of choices) {
    if (!/^Choose card [AB]$/.test(label)) {
      throw new Error(`Card label leaks identity before feedback: "${label}"`);
    }
  }

  // Invariant 1: the canonical choice question, with the question mark.
  const questionProof = await evaluate(
    ws,
    `(() => {
      const question = document.querySelector(".question-text");
      if (!question) return null;
      return {
        text: question.innerText.trim(),
        visible: getComputedStyle(question).visibility !== "hidden",
      };
    })()`,
  );
  if (!questionProof?.visible) {
    throw new Error("Choice question is not visible during the choice phase");
  }
  if (
    !questionProof.text.startsWith("Which one do you think means ") ||
    !questionProof.text.endsWith("?")
  ) {
    throw new Error(`Choice question is not canonical: "${questionProof.text}"`);
  }

  // 27E: the two meaning lines must follow the round's seed-drawn
  // targetMeaningListedFirst flag, asserted against this round's actual
  // payload (never a cross-session diff — a coin flip can coincide).
  const meaningOrder = await assertMeaningLineOrder(ws, questionProof.text);

  const activeProgressText = await evaluate(
    ws,
    "document.querySelector('.trial-progress')?.innerText ?? ''",
  );
  // Practice rounds replace the round counter with "Practice round" plus a
  // "Not scored" note (CSS uppercases the note, so match case-insensitively)
  // and must not show the score readout.
  const isPracticeRound = activeProgressText.includes("Practice round");
  if (isPracticeRound) {
    if (!/not scored/i.test(activeProgressText)) {
      throw new Error(
        `Practice header is missing the Not scored note: ${activeProgressText}`,
      );
    }
    if (
      activeProgressText.includes("Session score") ||
      /Round \d+ \/ \d+/.test(activeProgressText)
    ) {
      throw new Error(
        `Practice header leaked the scored-round readout: ${activeProgressText}`,
      );
    }
    if (!practiceShotTaken) {
      practiceShotTaken = true;
      await captureScreenshot(ws, "practice-round");
    }
  } else if (
    !activeProgressText.includes("Round") ||
    !activeProgressText.includes("Session score")
  ) {
    throw new Error(`Progress display is missing or incomplete: ${activeProgressText}`);
  }

  const activeDashboardVisible = await evaluate(
    ws,
    "Boolean(document.querySelector('.score-section'))",
  );
  if (activeDashboardVisible) {
    throw new Error("Leaderboard/recent attempts section is visible during active gameplay");
  }

  const presentationProof = await evaluate(
    ws,
    `(() => ({
      displayCount: document.querySelectorAll(".stimulus-display").length,
      placeholderCount: [...document.querySelectorAll(".placeholder-display")]
        .filter((face) => getComputedStyle(face).visibility !== "hidden").length,
      hiddenMediaCount: document.querySelectorAll(".stimulus-media-hidden").length,
      visibleMediaCount: [...document.querySelectorAll(".stimulus-media")]
        .filter((media) => getComputedStyle(media).opacity !== "0").length,
    }))()`,
  );
  if (presentationProof.displayCount !== 2) {
    throw new Error(
      `Expected 2 React stimulus displays, found ${presentationProof.displayCount}`,
    );
  }
  if (presentationProof.placeholderCount !== 2) {
    throw new Error(
      `Audio-only condition should show 2 visible neutral placeholders, found ${presentationProof.placeholderCount}`,
    );
  }
  if (presentationProof.visibleMediaCount > 0) {
    throw new Error("Legacy stimulus media is visible during active gameplay");
  }

  // NIL-63 replay waypoint (§8 exit): once, during the choice phase, prove the
  // per-card replay control re-plays card A's audio without touching phase or
  // selection. A replay re-plays the cached blob (no network request), so this
  // instruments HTMLMediaElement.prototype.play and asserts a play() call, not a
  // request. It asserts audio + state only — spin is decorative, never checked.
  if (!replayWaypointDone) {
    replayWaypointDone = true;

    const before = await evaluate(
      ws,
      `(() => {
        if (!window.__replayPlaysPatched) {
          window.__replayPlaysPatched = true;
          window.__replayPlays = 0;
          const proto = HTMLMediaElement.prototype;
          const original = proto.play;
          proto.play = function patchedPlay(...args) {
            window.__replayPlays += 1;
            return original.apply(this, args);
          };
        }
        const buttons = [...document.querySelectorAll(".card-replay-button")];
        const q = document.querySelector(".question-text");
        return {
          count: window.__replayPlays,
          buttons: buttons.length,
          markup: buttons.map((b) => b.outerHTML),
          questionVisible: Boolean(q) && getComputedStyle(q).visibility !== "hidden",
        };
      })()`,
    );
    if (before.buttons !== 2) {
      throw new Error(
        `Expected 2 replay controls during choice, found ${before.buttons}`,
      );
    }
    // §8 identity symmetry: both controls byte-identical modulo the A/B label.
    const [markupA, markupB] = before.markup;
    if (
      markupA.replace("Replay card A", "Replay card X") !==
      markupB.replace("Replay card B", "Replay card X")
    ) {
      throw new Error("Replay controls are not byte-identical between card A and B");
    }
    if (!before.questionVisible) {
      throw new Error("Choice question is not visible before the replay waypoint");
    }

    await captureScreenshot(ws, "replay-choice");

    // Click card A's replay (native button — element.click() is fine, §16 H7).
    const clicked = await evaluate(
      ws,
      `(() => {
        const button = document.querySelector(".card-replay-button");
        if (!button) return false;
        button.click();
        return true;
      })()`,
    );
    if (!clicked) {
      throw new Error("Could not click the card A replay control");
    }

    const after = await waitFor(
      async () =>
        evaluate(
          ws,
          `(() => {
            const q = document.querySelector(".question-text");
            const state = {
              count: window.__replayPlays,
              choiceButtons: document.querySelectorAll(".stimulus-row .choice-button").length,
              feedback: Boolean(document.querySelector(".feedback")),
              questionVisible: Boolean(q) && getComputedStyle(q).visibility !== "hidden",
            };
            return state.count > ${before.count} ? state : null;
          })()`,
        ),
      "card A replay to re-play audio",
      5000,
    );

    // Phase/selection unchanged: still choice, no feedback, question visible,
    // both choice cards present.
    if (after.feedback) {
      throw new Error("Replay advanced the trial to feedback (must not select)");
    }
    if (!after.questionVisible) {
      throw new Error("Replay hid the choice question (phase changed)");
    }
    if (after.choiceButtons !== 2) {
      throw new Error(
        `Replay disturbed the choice cards, found ${after.choiceButtons}`,
      );
    }
  }

  const selectedLabel = await evaluate(
    ws,
    `(() => {
      const firstChoice = document.querySelector(".stimulus-row .choice-button");
      if (!firstChoice) return "";
      const label = firstChoice.getAttribute("aria-label") ?? firstChoice.textContent;
      firstChoice.click();
      return label.trim();
    })()`,
  );
  if (!selectedLabel) {
    throw new Error("Could not select an ideophone option");
  }

  await waitFor(
    () => evaluate(ws, "Boolean(document.querySelector('.feedback'))"),
    "feedback panel",
  );

  const feedbackText = await evaluate(
    ws,
    "document.querySelector('.feedback')?.innerText ?? ''",
  );
  const wasIncorrect = feedbackText.includes("Incorrect");
  if (wasIncorrect) {
    if (!feedbackText.includes("You chose")) {
      throw new Error("Feedback did not identify the selected card");
    }
    if (!feedbackText.includes("Correct word")) {
      throw new Error("Feedback did not identify the correct card");
    }
  }
  if (!/Card [AB]/i.test(feedbackText)) {
    throw new Error("Feedback did not identify the card side");
  }
  if (!feedbackText.includes("Romaji")) {
    throw new Error("Feedback did not include romaji");
  }
  if (!feedbackText.includes("Meaning")) {
    throw new Error("Feedback did not include meanings");
  }

  // Outcome-height parity: both outcomes render two summary-card cells; the
  // correct outcome hides the second card but keeps its reserved space.
  const feedbackCards = await evaluate(
    ws,
    `(() => {
      const cards = [...document.querySelectorAll(".feedback-choice-card")];
      return {
        total: cards.length,
        hidden: cards.filter((card) =>
          getComputedStyle(card).visibility === "hidden"
        ).length,
      };
    })()`,
  );
  if (feedbackCards.total !== 2) {
    throw new Error(
      `Feedback should reserve 2 summary card slots, found ${feedbackCards.total}`,
    );
  }
  if (feedbackCards.hidden !== (wasIncorrect ? 0 : 1)) {
    throw new Error(
      `Feedback hidden-card count is wrong for ${wasIncorrect ? "incorrect" : "correct"}: ` +
        `${feedbackCards.hidden}`,
    );
  }

  const outcomeName = wasIncorrect ? "incorrect" : "correct";
  if (!feedbackShotsTaken.has(outcomeName)) {
    feedbackShotsTaken.add(outcomeName);
    await captureScreenshot(ws, `feedback-${outcomeName}`);
  }

  await sleep(1200);
  const feedbackStillVisible = await evaluate(
    ws,
    "Boolean(document.querySelector('.feedback') && document.querySelector('.feedback-next-button'))",
  );
  if (!feedbackStillVisible) {
    throw new Error("Feedback did not stay visible until Next round");
  }
  if (!(await clickText(ws, "Next round"))) {
    throw new Error("Next round button not found");
  }

  return {
    choices,
    selectedLabel,
    practice: isPracticeRound,
    progressText: activeProgressText,
    feedback: wasIncorrect ? "Incorrect" : "Correct",
    presentation: presentationProof,
    meaningOrder,
  };
}

// Perception Ladder (NIL-42). The trial board is the Meaning Match board,
// byte-identical (invariant 5), so this drives only the ladder FRAME: the floor
// stack, the floor-intro Dialog, and floor completion. The floor runs in the
// default audio-only condition, so the board matches the audio-only
// presentation answerCurrentRound already asserts. Audio is unlocked page-wide
// by the Meaning Match sound check earlier in this same session.
//
// §16 H7 rider (V9): the floor-intro Dialog is new Radix on a browser-loop
// path, so its activation/dismiss idiom ships here — open it from the native
// floor-card button (a controlled Dialog), read its PORTALED content from
// document.body, activate the primary (coordinate-free focus+Enter, click
// fallback), and confirm it dismisses into the running floor.
async function verifyPerceptionLadder(ws) {
  // Back to the mode grid via the header title, then open the ladder.
  if (!(await clickText(ws, "Ideophone Arena"))) {
    throw new Error("Site title (back to modes) not found");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Choose a mode"),
    "mode select after returning home",
  );
  if (!(await clickText(ws, "Perception Ladder"))) {
    throw new Error("Perception Ladder mode card not found");
  }
  await waitFor(
    async () => {
      // Floor-stack labels/pills are `.specimen`, CSS-uppercased in innerText —
      // match case-insensitively (as the loop does for other uppercased labels).
      const text = (await bodyText(ws)).toLowerCase();
      return text.includes("floor 1 · sound") && text.includes("up next");
    },
    "ladder floor stack",
  );
  await captureScreenshot(ws, "ladder-stack");

  // Open the floor-1 intro Dialog (native card button → controlled Radix
  // Dialog; content portals to <body>, so bodyText still sees it).
  if (!(await clickText(ws, "Floor 1 · Sound"))) {
    throw new Error("Floor 1 (Sound) card not found");
  }
  await waitFor(
    async () => {
      const text = await bodyText(ws);
      return text.includes("Start floor 1") && text.includes("Presentation");
    },
    "floor-intro dialog",
  );
  const dialogText = await bodyText(ws);
  for (const option of ["Audio only", "Script match", "Script mismatch"]) {
    if (!dialogText.includes(option)) {
      throw new Error(`Floor-intro condition picker is missing "${option}"`);
    }
  }
  await captureScreenshot(ws, "ladder-floor-intro");

  // Activate the primary — coordinate-free (works at 375px), click fallback.
  if (
    !(await trustedPressEnterOnText(ws, "Start floor 1")) &&
    !(await clickText(ws, "Start floor 1"))
  ) {
    throw new Error("Start floor 1 button not found");
  }
  // The Dialog must dismiss (its content leaves the document) once the floor
  // starts — the run view replaces it with the trial board.
  await waitFor(
    async () => !(await bodyText(ws)).includes("Start floor 1"),
    "floor-intro dialog to dismiss on start",
  );

  // Play the floor to completion, proving the final-rung marker appears on the
  // last pair. answerCurrentRound is reused unchanged (same board).
  let sawFinalRung = false;
  let played = 0;
  while (played < 15) {
    const state = await waitFor(
      async () => {
        const text = await bodyText(ws);
        if (text.includes("Floor cleared:")) return "done";
        if (text.includes("Which one do you think means")) return "choice";
        return "";
      },
      "ladder choice or floor completion",
      45000,
    );
    if (state === "done") {
      break;
    }
    // The "Final rung" marker is a `.specimen`, CSS-uppercased in innerText.
    if ((await bodyText(ws)).toLowerCase().includes("final rung")) {
      sawFinalRung = true;
    }
    await answerCurrentRound(ws, false);
    played += 1;
  }
  if (played >= 15) {
    throw new Error("Ladder floor did not complete within 15 pairs");
  }
  if (!sawFinalRung) {
    throw new Error("Ladder final-rung marker never appeared during the floor");
  }

  const completeText = await bodyText(ws);
  if (!completeText.includes("Floor cleared:")) {
    throw new Error("Floor completion panel did not appear");
  }
  // Benchmark grammar (V7): thesis floor mean vs the player's score.
  if (!completeText.includes("thesis") || !completeText.includes("You:")) {
    throw new Error("Floor completion is missing the benchmark grammar");
  }
  await captureScreenshot(ws, "ladder-floor-complete");

  return {
    pairsPlayed: played,
    finalRungSeen: sawFinalRung,
    completionVisible: completeText.includes("Floor cleared:"),
  };
}
