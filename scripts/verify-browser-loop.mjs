const baseUrl = process.argv[2] ?? "http://127.0.0.1:5174/";
const cdpVersionUrl = process.argv[3] ?? "http://127.0.0.1:9224/json/version";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function trustedClickText(ws, text) {
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
  await send(ws, "Page.navigate", { url: baseUrl });
  await waitFor(
    () => evaluate(ws, "document.readyState === 'complete'"),
    "page load",
  );
  await evaluate(ws, "localStorage.clear()");
  await send(ws, "Page.reload");
  await waitFor(
    async () => (await bodyText(ws)).includes("Ideophone Arena"),
    "auth screen",
  );

  if (!(await clickText(ws, "Register"))) {
    throw new Error("Register tab not found");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Email"),
    "register form",
  );
  await setInputByLabel(ws, "Username", username);
  await setInputByLabel(ws, "Email", email);
  await setInputByLabel(ws, "Password", password);
  if (!(await submitCurrentForm(ws))) {
    throw new Error("Register submit not found");
  }

  await waitFor(
    async () => (await bodyText(ws)).includes("Choosing Task Instructions"),
    "instructions after register",
  );
  await assertScriptLabSelector(ws);
  if (!(await trustedClickText(ws, "Sound check"))) {
    throw new Error("Sound check button not found");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Sound check passed."),
    "sound check to pass",
    10000,
  );
  if (!(await clickText(ws, "Start Game"))) {
    throw new Error("Start Game button not found");
  }

  await waitForSessionRequest();

  const sessionBody = sessionRequests[0]?.postData ?? "";
  if (!sessionBody.includes('"conditionName":"CONDITION_1_SOKUON"')) {
    throw new Error(
      `Default session request did not send CONDITION_1_SOKUON: ${sessionBody}`,
    );
  }
  if (!sessionBody.includes('"difficultyLevel":1')) {
    throw new Error(`Session request did not send difficultyLevel 1: ${sessionBody}`);
  }

  const answeredRounds = [];
  let completed = false;

  for (let roundNumber = 1; roundNumber <= 40; roundNumber += 1) {
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
    throw new Error("Session did not reach completion within 40 answered rounds");
  }

  await waitFor(
    async () => (await bodyText(ws)).includes("Session complete"),
    "completion screen remains visible",
  );

  const finalText = await bodyText(ws);
  if (!finalText.includes("Leaderboard")) {
    throw new Error("Leaderboard is not visible after completion");
  }
  if (!(await clickText(ws, "Recent attempts"))) {
    throw new Error("Recent attempts tab is not clickable after completion");
  }
  await waitFor(
    async () => (await bodyText(ws)).includes("Recent Attempts"),
    "recent attempts panel",
  );
  const attemptsText = await bodyText(ws);
  if (stimulusRequests.length === 0) {
    throw new Error("No /stimuli/ media requests were observed");
  }
  const stimulusSuccessCount = stimulusRequests.filter(
    (request) => request.status && request.status < 400,
  ).length;
  if (stimulusSuccessCount === 0) {
    throw new Error("No successful /stimuli/ media responses were observed");
  }
  const mutedStimulusCount = await evaluate(
    ws,
    `(() => [...document.querySelectorAll(".stimulus-media")]
      .filter((media) => media.muted || media.defaultMuted || media.volume === 0)
      .length)()`,
  );
  if (mutedStimulusCount > 0) {
    throw new Error(`Muted stimulus media elements are present: ${mutedStimulusCount}`);
  }

  const staleControls = await evaluate(
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
  if (Array.isArray(staleControls) && staleControls.length > 0) {
    throw new Error(`Stale condition/difficulty controls are visible: ${staleControls.join(", ")}`);
  }

  const hasBearerRequest = protectedRequests.some((request) =>
    /^Bearer\s+\S+/.test(request.authorization),
  );
  const protectedSuccessCount = protectedRequests.filter((request) => {
    const isProtectedPath = request.url.includes("/api/game/");
    return isProtectedPath && request.status && request.status < 400;
  }).length;
  if (!hasBearerRequest && protectedSuccessCount === 0) {
    throw new Error(
      "No protected API request showed a bearer token or successful protected response",
    );
  }
  const relevantConsoleErrors = consoleErrors.filter(
    (message) => !message.includes("Download the React DevTools"),
  );
  if (relevantConsoleErrors.length > 0) {
    throw new Error(
      `Browser console errors were observed: ${relevantConsoleErrors.join(" | ")}`,
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
        answeredRoundCount: answeredRounds.length,
        firstRound: answeredRounds[0],
        sessionRequest: sessionRequests[0],
        completionVisible: completed,
        leaderboardVisible: finalText.includes("Leaderboard"),
        recentAttemptsVisible: attemptsText.includes("Recent Attempts"),
        staleControlCount: Array.isArray(staleControls)
          ? staleControls.length
          : 0,
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
        consoleMessages: consoleMessages.slice(0, 5),
      },
      null,
      2,
    ),
  );
  ws.close();
}

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});

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
    `(() => [...document.querySelectorAll(".stimulus-row button")].map((button) =>
      (button.getAttribute("aria-label") ?? button.textContent).trim()
    ))()`,
  );
  if (!Array.isArray(choices) || choices.length !== 2) {
    throw new Error(`Expected 2 ideophone choices, found ${choices.length}`);
  }

  const activeProgressText = await evaluate(
    ws,
    "document.querySelector('.trial-progress')?.innerText ?? ''",
  );
  if (
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
      placeholderCount: document.querySelectorAll(".placeholder-display").length,
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
      `Audio-only condition should render 2 React placeholders, found ${presentationProof.placeholderCount}`,
    );
  }
  if (presentationProof.visibleMediaCount > 0) {
    throw new Error("Legacy stimulus media is visible during active gameplay");
  }

  const selectedKana = await evaluate(
    ws,
    `(() => {
      const firstChoice = document.querySelector(".stimulus-row button");
      if (!firstChoice) return "";
      const kana = firstChoice.getAttribute("aria-label") ?? firstChoice.textContent;
      firstChoice.click();
      return kana.trim();
    })()`,
  );
  if (!selectedKana) {
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
    selectedKana,
    feedback: wasIncorrect ? "Incorrect" : "Correct",
    presentation: presentationProof,
  };
}
