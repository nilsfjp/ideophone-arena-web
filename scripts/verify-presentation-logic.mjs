import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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
    ],
    { cwd: process.cwd() },
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
