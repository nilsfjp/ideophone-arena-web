import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Experiment invariant 3: script display is received from the backend, never
// computed. These identifiers belonged to the deleted kana heuristics and must
// never reappear anywhere in src/.
const FORBIDDEN_PATTERNS = [
  "toKatakana",
  "toHiragana",
  "convertKana",
  "detectKanaFamily",
  "containsKana",
  "getCanonicalDisplayForm",
  "getOppositeDisplayForm",
  "getPreAnswerDisplayForm",
  "0x3041",
  "0x30a1",
];

await scanForForbiddenKanaLogic(join(process.cwd(), "src"));

// The compile output must live inside the repo so the compiled JSX can resolve
// react/jsx-runtime from node_modules.
const tempDir = await mkdtemp(join(process.cwd(), ".verify-presentation-"));

try {
  await execFileAsync(
    "node_modules/.bin/tsc",
    [
      "src/conditionPresentation.ts",
      "src/components/StimulusDisplay.tsx",
      "src/components/TrialPlayer.tsx",
      "src/components/RatingLab.tsx",
      "src/components/ProductionLab.tsx",
      "--ignoreConfig",
      "--jsx",
      "react-jsx",
      "--rootDir",
      "src",
      "--target",
      "ES2023",
      "--module",
      "ES2022",
      "--moduleResolution",
      "bundler",
      "--skipLibCheck",
      "--outDir",
      tempDir,
      "--noEmit",
      "false",
      "--declaration",
      "false",
      // api/client.ts types import.meta.env via vite/client, which is not in
      // scope under --ignoreConfig. Type checking already happens in the build
      // (tsc -b); this compile only needs the JS output.
      "--noCheck",
    ],
    { cwd: process.cwd() },
  );

  // tsc emits the bundler-style extensionless relative specifiers verbatim,
  // which plain Node ESM cannot resolve; append .js so the graph loads.
  await appendJsExtensions(tempDir);

  // api/client.ts reads import.meta.env at module scope, which only exists
  // under Vite. The board render never touches the network, so a stub with the
  // same exports keeps the compiled TrialPlayer graph importable in plain Node.
  await writeFile(
    join(tempDir, "api/client.js"),
    [
      "export class ApiError extends Error {}",
      "export const backendUrl = (path) => path;",
      "export const fetchBackendBlob = async () => new Blob();",
      "export const submitAnswer = async () => { throw new Error('stub'); };",
      "export const submitRating = async () => { throw new Error('stub'); };",
      "export const getMyRatings = async () => ({ entries: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });",
      "export const getAllMyRatings = async () => [];",
      "export const getRatableWords = async () => ({ entries: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });",
      "export const getAllRatableWords = async () => [];",
      "export const getDivergence = async () => [];",
      "export const getNextProductionPrompt = async () => ({ completed: true, ideophoneId: null, gloss: null, modality: null, totalProducible: 0 });",
      "export const submitProduction = async () => { throw new Error('stub'); };",
      "export const getMyProductions = async () => ({ entries: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });",
      "export const getAllMyProductions = async () => [];",
      "export const isUnparseableInput = () => false;",
      "",
    ].join("\n"),
  );

  const presentation = await import(
    `file://${join(tempDir, "conditionPresentation.js")}`
  );
  const { default: StimulusDisplay } = await import(
    `file://${join(tempDir, "components/StimulusDisplay.js")}`
  );
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { jsx } = await import("react/jsx-runtime");

  assertEqual(
    presentation.getConditionPresentation("CONDITION_1_SOKUON").kind,
    "audio-only",
    "condition 1 should map to audio-only",
  );
  assertEqual(
    presentation.getConditionPresentation("CONDITION_2_SOKUON").kind,
    "script-match",
    "condition 2 should map to script-match",
  );
  assertEqual(
    presentation.getConditionPresentation("CONDITION_3_SOKUON").kind,
    "script-mismatch",
    "condition 3 should map to script-mismatch",
  );
  assertEqual(
    presentation.getConditionPresentation("UNKNOWN").kind,
    "unknown",
    "unknown conditions should fall back safely",
  );

  // Mirrors backend seed rows. The mismatch sample uses the long-vowel ー
  // normalization (じゃあじゃあ -> ジャージャー) that per-character kana
  // conversion gets wrong, so a verbatim match proves pass-through rendering.
  const matchOption = {
    ideophoneId: 62,
    kana: "かたかた",
    displayForm: "カタカタ",
    canonicalForm: "カタカタ",
    romaji: "katakata",
    canonicalScript: "KK",
  };
  const mismatchOption = {
    ideophoneId: 125,
    kana: "じゃあじゃあ",
    displayForm: "ジャージャー",
    canonicalForm: "じゃーじゃー",
    romaji: "zyaazyaa",
    canonicalScript: "HK",
  };

  function renderDisplay(option, conditionName, revealDetails = false, meaning) {
    return renderToStaticMarkup(
      jsx(StimulusDisplay, {
        meaning,
        option,
        positionLabel: "A",
        presentation: presentation.getConditionPresentation(conditionName),
        revealDetails,
      }),
    );
  }

  const matchMarkup = renderDisplay(matchOption, "CONDITION_2_SOKUON");
  assertEqual(
    countOccurrences(matchMarkup, matchOption.displayForm),
    1,
    "script-match should render the backend displayForm verbatim exactly once",
  );

  const mismatchMarkup = renderDisplay(mismatchOption, "CONDITION_3_SOKUON");
  assertEqual(
    countOccurrences(mismatchMarkup, mismatchOption.displayForm),
    1,
    "script-mismatch should render the backend displayForm verbatim exactly once",
  );
  assertEqual(
    mismatchMarkup.includes(naiveKatakana(mismatchOption.kana)),
    false,
    "script-mismatch must not render a per-character kana conversion",
  );

  const audioMarkup = renderDisplay(matchOption, "CONDITION_1_SOKUON");
  assertEqual(
    audioMarkup.includes("placeholder-display"),
    true,
    "audio-only should render the neutral placeholder pre-answer",
  );
  for (const leaked of [
    matchOption.displayForm,
    matchOption.canonicalForm,
    matchOption.romaji,
  ]) {
    assertEqual(
      audioMarkup.includes(leaked),
      false,
      `audio-only must not leak "${leaked}" pre-answer`,
    );
  }

  const revealMarkup = renderDisplay(
    mismatchOption,
    "CONDITION_3_SOKUON",
    true,
    "noisily gushing",
  );
  for (const revealed of [
    mismatchOption.canonicalForm,
    mismatchOption.romaji,
    "noisily gushing",
  ]) {
    assertEqual(
      revealMarkup.includes(revealed),
      true,
      `feedback reveal should render "${revealed}"`,
    );
  }

  // Invariant 1: the frozen strings live in experimentText.ts and must carry
  // the user-adjudicated wording (2026-06-10) verbatim.
  const text = await import(`file://${join(tempDir, "experimentText.js")}`);
  assertEqual(
    text.LISTEN_INSTRUCTION,
    "Listen to these two Japanese words.",
    "LISTEN_INSTRUCTION must keep the adjudicated wording",
  );
  assertEqual(
    text.MEANING_TARGET_PREFIX,
    "One of them means ",
    "MEANING_TARGET_PREFIX must keep the adjudicated wording",
  );
  assertEqual(
    text.MEANING_OTHER_PREFIX,
    "The other means ",
    "MEANING_OTHER_PREFIX must keep the adjudicated wording",
  );
  assertEqual(
    text.CHOICE_QUESTION_PREFIX,
    "Which one do you think means ",
    "CHOICE_QUESTION_PREFIX must keep the adjudicated wording",
  );
  assertEqual(
    text.CHOICE_QUESTION_SUFFIX,
    "?",
    "CHOICE_QUESTION_SUFFIX must be the question mark",
  );

  const { default: TrialPlayer } = await import(
    `file://${join(tempDir, "components/TrialPlayer.js")}`
  );
  const boardMarkup = renderToStaticMarkup(
    jsx(TrialPlayer, {
      round: {
        sessionUuid: "verify-session",
        roundId: 1,
        targetTranslation: "clattering, rattling",
        conditionName: "CONDITION_1_SOKUON",
        difficultyLevel: 1,
        translations: {
          target: "clattering, rattling",
          other: "noisily gushing",
        },
        left: matchOption,
        right: mismatchOption,
      },
      sessionStats: { answered: 0, correct: 0 },
      sessionUuid: "verify-session",
      totalRounds: 30,
      onAnswered: () => {},
      onAuthExpired: () => {},
      onBackToStart: () => {},
      onNeedNextRound: () => {},
    }),
  );

  // Frozen strings render in their designated slots exactly once, already at
  // the initial (fixation) render because the whole board mounts up front.
  assertEqual(
    countOccurrences(boardMarkup, `<p>${text.LISTEN_INSTRUCTION}</p>`),
    1,
    "the listen instruction should render exactly once in the trial-copy slot",
  );
  assertEqual(
    countOccurrences(
      boardMarkup,
      `${text.MEANING_TARGET_PREFIX}<strong>clattering, rattling</strong>`,
    ),
    1,
    "the target translation line should render exactly once with a bold target",
  );
  assertEqual(
    countOccurrences(
      boardMarkup,
      `${text.MEANING_OTHER_PREFIX}<strong>noisily gushing</strong>`,
    ),
    1,
    "the other translation line should render exactly once with a bold meaning",
  );
  assertEqual(
    countOccurrences(
      boardMarkup,
      `${text.CHOICE_QUESTION_PREFIX}<strong>clattering, rattling</strong>${text.CHOICE_QUESTION_SUFFIX}`,
    ),
    1,
    "the choice question should render exactly once, bold target then question mark",
  );

  // Reserved layout: every phase slot exists in the initial render — both
  // card slots, the fixation overlay, translations, question, status line.
  for (const slot of [
    "trial-board",
    "fixation-cross",
    "translation-lines",
    "question-text",
    "status-line",
  ]) {
    assertEqual(
      boardMarkup.includes(slot),
      true,
      `the initial board render should mount the "${slot}" slot`,
    );
  }
  assertEqual(
    countOccurrences(boardMarkup, "ideophone-card"),
    2,
    "both card slots should be mounted from fixation onward",
  );

  // Invariant 1 (Rating Task, 27D): the rating strings were adjudicated
  // 2026-07-02 as Gorilla/thesis verbatim (dynamic count, time estimate
  // dropped) and must not drift.
  const ratingStrings = {
    RATING_INTRO_PREFIX: "In this task, you will rate ",
    RATING_INTRO_AFTER_COUNT:
      " words from the previous task. In each trial, you will be shown a Japanese word together with its English meaning. Your task is to rate how much you think the word resembles its meaning on a scale from ",
    RATING_INTRO_TO: " to ",
    RATING_SENTENCE_END: ".",
    RATING_SCALE_MIN: "1",
    RATING_SCALE_MAX: "7",
    RATING_INDICATES: " indicates ",
    RATING_WHILE: " while ",
    RATING_ANCHOR_LOW_INLINE: "no resemblance",
    RATING_ANCHOR_HIGH_INLINE: "strong resemblance",
    RATING_HOW_TO:
      "Click on a number (1–7) to select your rating, then press 'Next' to submit your response.",
    RATING_LISTEN_LINE_1: "Listen to the Japanese word below.",
    RATING_LISTEN_LINE_2: "Click to replay.",
    RATING_MEANING_PREFIX: "It means ",
    RATING_QUESTION:
      "Do you think there is a resemblance between the word and its meaning?",
    RATING_SCALE_LOW_LABEL: "No resemblance",
    RATING_SCALE_HIGH_LABEL: "Strong resemblance",
    RATING_REPLAY_BUTTON: "Replay",
    RATING_NEXT_BUTTON: "Next",
  };
  for (const [name, expected] of Object.entries(ratingStrings)) {
    assertEqual(
      text[name],
      expected,
      `${name} must keep the adjudicated rating-task wording`,
    );
  }

  // The rating trial mirrors the Gorilla layout: audio-only stimulus card (no
  // script, no romaji before the lab record), frozen strings each exactly
  // once, seven scale buttons, and a reserved reveal slot from first paint.
  const { RatingTrialPanel } = await import(
    `file://${join(tempDir, "components/RatingLab.js")}`
  );
  const ratingWord = {
    ideophoneId: 62,
    canonicalForm: "カタカタ",
    romaji: "katakata",
    stimulusUrl: "/stimuli/audio/a0a-sample.m4a",
    modality: "AUDITORY",
    meaning: "clattering, rattling",
    sessionUuid: "verify-session",
    addedAt: "2026-07-02T00:00:00.000Z",
  };
  const ratingMarkup = renderToStaticMarkup(
    jsx(RatingTrialPanel, {
      index: 0,
      phase: "rating",
      replayToken: 1,
      reveal: null,
      selectedRating: null,
      statusMessage: "",
      total: 12,
      word: ratingWord,
      onNext: () => {},
      onPlaybackError: () => {},
      onReplay: () => {},
      onSelectRating: () => {},
      onSubmit: () => {},
    }),
  );

  for (const [line, label] of [
    [text.RATING_LISTEN_LINE_1, "first listen line"],
    [text.RATING_LISTEN_LINE_2, "replay line"],
    [text.RATING_QUESTION, "resemblance question"],
    [text.RATING_SCALE_LOW_LABEL, "low anchor"],
    [text.RATING_SCALE_HIGH_LABEL, "high anchor"],
  ]) {
    assertEqual(
      countOccurrences(ratingMarkup, line),
      1,
      `the rating trial should render the ${label} exactly once`,
    );
  }
  assertEqual(
    countOccurrences(
      ratingMarkup,
      `${text.RATING_MEANING_PREFIX}<strong>${ratingWord.meaning}</strong>`,
    ),
    1,
    "the meaning line should render exactly once with a bold meaning",
  );
  // §11.2: count by class prefix so appended Tailwind utilities never break
  // the tally (the semantic hook stays first per the §5 contract).
  assertEqual(
    (ratingMarkup.match(/class="rating-scale-button[ "]/g) ?? []).length,
    7,
    "the rating scale should render exactly seven buttons",
  );
  for (const leaked of [ratingWord.canonicalForm, ratingWord.romaji]) {
    assertEqual(
      ratingMarkup.includes(leaked),
      false,
      `the rating trial must not leak "${leaked}" — the stimulus stays audio-only`,
    );
  }
  // §11.2: the "rating-reveal slot-hidden" adjacency survives because the §5
  // stable-hook contract keeps the semantic classes first (utilities, if any,
  // are appended after slot-hidden — never between the two hooks).
  for (const slot of ["rating-reveal slot-hidden", "status-line"]) {
    assertEqual(
      ratingMarkup.includes(slot),
      true,
      `the initial rating render should mount the reserved "${slot}" slot`,
    );
  }

  // ---- Word Mint (NIL-62): frozen §8 strings + the kana-verbatim reveal ----
  const mint = await import(`file://${join(tempDir, "components/ProductionLab.js")}`);

  const mintStrings = {
    MINT_INSTRUCTION:
      "Invent a word whose sound fits the meaning below. Type it in roman letters.",
    MINT_ONE_SHOT_LABEL: "One try per word",
    MINT_ONE_SHOT_SUPPORT: "Your first instinct is the data.",
    MINT_SUBMIT_BUTTON: "Mint this word",
    MINT_PARSE_ERROR_PREFIX:
      "That didn't read as speakable syllables — try simple roman letters, like ",
    MINT_PARSE_ERROR_EXAMPLE_ONE: "gorogoro",
    MINT_PARSE_ERROR_BETWEEN: " or ",
    MINT_PARSE_ERROR_EXAMPLE_TWO: "pika",
    MINT_REVEAL_PREFIX: "The real word is ",
    MINT_SCORE_LABEL: "Similarity · 0–100",
    MINT_BAND_ALMOST: " — your instinct is almost the same word.",
    MINT_BAND_MOST: " — your instinct shares most of its shape with the real word.",
    MINT_BAND_SOME: " — your word and the real one share some bones.",
    MINT_BAND_DIFFERENT: " — a different creature — which is also data.",
    MINT_NEXT_BUTTON: "Next meaning",
    MINT_BACK_BUTTON: "Back to modes",
    MINT_STATUS_WORD_PREFIX: "Word ",
    MINT_STATUS_OF: " of ",
    MINT_STATUS_MEAN_PREFIX: " · your mean ",
  };
  for (const [key, expected] of Object.entries(mintStrings)) {
    assertEqual(text[key], expected, `${key} must keep the NIL-83 adjudicated wording`);
  }

  // The prompt: the meaning is the whole prompt. No kana, no romaji, no audio.
  const mintPrompt = {
    completed: false,
    ideophoneId: 60,
    gloss: "with a rapid heartbeat",
    modality: "INTEROCEPTIVE",
    totalProducible: 94,
  };
  const mintPromptMarkup = renderToStaticMarkup(
    jsx(mint.MintPromptPanel, {
      prompt: mintPrompt,
      value: "",
      parseError: false,
      submitting: false,
      onChange: () => {},
      onSubmit: () => {},
    }),
  );
  assertEqual(
    countOccurrences(mintPromptMarkup, `<p class="mint-instruction" id="mint-label">${text.MINT_INSTRUCTION}</p>`),
    1,
    "the mint prompt should render the frozen instruction exactly once, as the input's label",
  );
  assertEqual(
    countOccurrences(mintPromptMarkup, `<strong>${mintPrompt.gloss}</strong>`),
    1,
    "the mint prompt should render the meaning bold, exactly once",
  );
  // Invariant 5: the parse helper is mounted from first paint, so revealing it
  // never pushes the input or the submit button down.
  assertEqual(
    mintPromptMarkup.includes("mint-error slot-hidden"),
    true,
    'the initial mint render should mount the reserved "mint-error" slot',
  );

  const mintTarget = {
    displayForm: "どきどき",
    romaji: "dokidoki",
    gloss: "with a rapid heartbeat",
    stimulusUrl: "/stimuli/audio/i9h-dokidoki.m4a",
  };
  const mintRevealMarkup = renderToStaticMarkup(
    jsx(mint.MintRevealPanel, {
      result: {
        id: 40,
        ideophoneId: 60,
        input: "pikapika",
        similarityScore: 78,
        features: [
          { feature: "redup", yours: true, target: true, matched: true },
          { feature: "sokuon", yours: false, target: false, matched: true },
          { feature: "finalN", yours: false, target: false, matched: true },
          { feature: "riSuffix", yours: false, target: false, matched: true },
          { feature: "voicedOnset", yours: false, target: true, matched: false },
          { feature: "heavyVowelRatio", yours: 0, target: 0.5, matched: false },
          { feature: "moraCount", yours: 4, target: 4, matched: true },
        ],
        target: mintTarget,
      },
      replayToken: 1,
      onReplay: () => {},
      onNext: () => {},
      onBackToHome: () => {},
    }),
  );
  // Invariant 1/3: the reveal form is the backend's displayForm, rendered
  // verbatim — never converted, and never a per-character kana derivation.
  assertEqual(
    countOccurrences(
      mintRevealMarkup,
      `${text.MINT_REVEAL_PREFIX}<strong class="reveal-kana" lang="ja">${mintTarget.displayForm}</strong>`,
    ),
    1,
    "the mint reveal should render the backend displayForm verbatim, exactly once",
  );
  assertEqual(
    mintRevealMarkup.includes(naiveKatakana(mintTarget.displayForm)),
    false,
    "the mint reveal must never render a client-side kana conversion of the display form",
  );
  // The player's romaji is displayed exactly as typed, never converted.
  assertEqual(
    countOccurrences(mintRevealMarkup, "<code>pikapika</code>"),
    1,
    "the mint reveal should render the player's romaji exactly as typed",
  );
  // §8.2: the band string carries the score, and the numeral also stands alone.
  assertEqual(
    countOccurrences(mintRevealMarkup, `78${text.MINT_BAND_MOST}`),
    1,
    "the mint reveal should assemble the banded one-liner from the frozen string",
  );
  // §2.3.5: present-in-either features only — shared absences live in the table.
  assertEqual(
    (mintRevealMarkup.match(/class="mint-chip[ "]/g) ?? []).length,
    4,
    "the worked example should render exactly four chips (shared absences suppressed)",
  );
  // No kana glyphs in chrome chips (§2.3.5).
  const chipRow = mintRevealMarkup.split('<ul class="mint-chips">')[1]?.split("</ul>")[0] ?? "";
  assertEqual(
    /[ぁ-ヿ]/u.test(chipRow),
    false,
    "the mint chips must never carry kana glyphs",
  );

  console.log("Presentation logic verified.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function scanForForbiddenKanaLogic(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanForForbiddenKanaLogic(entryPath);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    const content = await readFile(entryPath, "utf8");
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (content.includes(pattern)) {
        throw new Error(
          `Forbidden kana-conversion identifier "${pattern}" found in ${entryPath}. ` +
            "Script display is received from the backend, never computed (invariant 3).",
        );
      }
    }
  }
}

async function appendJsExtensions(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await appendJsExtensions(entryPath);
      continue;
    }
    if (!entry.name.endsWith(".js")) {
      continue;
    }
    const content = await readFile(entryPath, "utf8");
    const rewritten = content.replace(
      /(from\s+")(\.{1,2}\/[^"]+)(")/g,
      (full, prefix, specifier, suffix) =>
        specifier.endsWith(".js")
          ? full
          : `${prefix}${specifier}.js${suffix}`,
    );
    if (rewritten !== content) {
      await writeFile(entryPath, rewritten);
    }
  }
}

function naiveKatakana(value) {
  return [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (!codePoint || codePoint < 0x3041 || codePoint > 0x3096) {
        return character;
      }
      return String.fromCodePoint(codePoint + 0x60);
    })
    .join("");
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, received ${actual}`);
  }
}
