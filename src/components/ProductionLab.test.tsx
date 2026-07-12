import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import type { ProductionPrompt, ProductionResponse } from "../api/types";
import {
  MINT_BAND_MOST,
  MINT_INSTRUCTION,
  MINT_ONE_SHOT_LABEL,
  MINT_ONE_SHOT_SUPPORT,
  MINT_SCORE_LABEL,
  MINT_SUBMIT_BUTTON,
} from "../experimentText";
import { classifySubmitError } from "../productionSubmit";
import {
  MintDonePanel,
  MintPromptPanel,
  MintRevealPanel,
  MintStatusLine,
} from "./ProductionLab";

const PROMPT: ProductionPrompt = {
  completed: false,
  ideophoneId: 60,
  gloss: "with a rapid heartbeat",
  modality: "INTEROCEPTIVE",
  totalProducible: 94,
};

// The adjudicated worked example: pikapika against dokidoki (i9) scores 78.
const REVEAL: ProductionResponse = {
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
    { feature: "heavyVowelRatio", yours: 0.0, target: 0.5, matched: false },
    { feature: "moraCount", yours: 4, target: 4, matched: true },
  ],
  target: {
    displayForm: "どきどき",
    romaji: "dokidoki",
    gloss: "with a rapid heartbeat",
    stimulusUrl: "/stimuli/audio/i9h-dokidoki.m4a",
  },
};

const noop = () => undefined;

function renderPrompt(overrides: { parseError?: boolean; value?: string } = {}) {
  return renderToStaticMarkup(
    <MintPromptPanel
      prompt={PROMPT}
      value={overrides.value ?? ""}
      parseError={overrides.parseError ?? false}
      submitting={false}
      onChange={noop}
      onSubmit={noop}
    />,
  );
}

function renderReveal() {
  return renderToStaticMarkup(
    <MintRevealPanel
      result={REVEAL}
      replayToken={1}
      onReplay={noop}
      onNext={noop}
      onBackToHome={noop}
    />,
  );
}

describe("MintPromptPanel", () => {
  const markup = renderPrompt();

  it("renders the frozen instruction and one-shot notice", () => {
    expect(markup).toContain(MINT_INSTRUCTION);
    expect(markup).toContain(MINT_ONE_SHOT_LABEL);
    expect(markup).toContain(MINT_ONE_SHOT_SUPPORT);
    expect(markup).toContain(MINT_SUBMIT_BUTTON);
  });

  it("shows the meaning in bold and the modality as a tinted specimen chip", () => {
    expect(markup).toContain("<strong>with a rapid heartbeat</strong>");
    expect(markup).toContain("mint-modality specimen mod-interoceptive");
    expect(markup).toContain("Meaning ·");
  });

  it("leaks nothing about the form to be invented", () => {
    // The meaning is the whole prompt: no kana, no romaji, no audio pre-submit.
    expect(markup).not.toContain("どきどき");
    expect(markup).not.toContain("dokidoki");
    expect(markup).not.toContain("<audio");
  });

  it("carries the V11 input attributes and labels the field with the instruction", () => {
    expect(markup).toContain('maxLength="24"');
    expect(markup).toContain('autoCapitalize="none"');
    expect(markup).toContain('autoCorrect="off"');
    expect(markup).toContain('spellCheck="false"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('aria-labelledby="mint-label"');
    expect(markup).toContain('aria-describedby="mint-error"');
  });

  it("reserves the parse-helper slot at first paint (invariant 5)", () => {
    // Mounted-but-hidden, so revealing it never pushes the input or the submit
    // button down.
    expect(markup).toContain("mint-error slot-hidden");
  });

  it("keeps the player's word and an active submit after a parse error", () => {
    // The one-shot promise on the client side: the attempt is not consumed, so
    // the typed value survives and the button stays live to try again.
    const errored = renderPrompt({ parseError: true, value: "pika pika!" });
    expect(errored).toContain('value="pika pika!"');
    expect(errored).toContain('class="mint-error"');
    expect(errored).not.toContain("mint-error slot-hidden");
    expect(errored).toContain('aria-invalid="true"');
    const submit = errored.split("<button").find((chunk) => chunk.includes(MINT_SUBMIT_BUTTON));
    expect(submit).toBeDefined();
    expect(submit).not.toContain("disabled");
  });

  it("renders the frozen parse helper with its two italic examples", () => {
    const errored = renderPrompt({ parseError: true });
    expect(errored).toContain("That didn&#x27;t read as speakable syllables");
    expect(errored).toContain("<em>gorogoro</em>");
    expect(errored).toContain("<em>pika</em>");
  });
});

describe("MintRevealPanel", () => {
  const markup = renderReveal();

  it("renders the backend display form verbatim, tagged as Japanese", () => {
    // Invariant 1/3: the reveal form is the backend value, never derived.
    expect(markup).toContain(
      '<strong class="reveal-kana" lang="ja">どきどき</strong>',
    );
    expect(markup).toContain("The real word is ");
  });

  it("shows the player's romaji exactly as typed, never converted", () => {
    expect(markup).toContain("<code>pikapika</code>");
  });

  it("assembles the score block from the frozen band string", () => {
    expect(markup).toContain('<span class="score-figure">78</span>');
    expect(markup).toContain(MINT_SCORE_LABEL);
    expect(markup).toContain(`<span class="score-caption">${MINT_BAND_MOST}</span>`);
    // The numeral belongs to the score figure alone; the caption never repeats it.
    expect(markup).not.toContain(`78${MINT_BAND_MOST}`);
  });

  it("keeps the top rule neutral - never verdict- or score-colored (V12)", () => {
    for (const verdict of ["correct", "incorrect", "positive", "negative"]) {
      expect(markup.split("<section")[1]?.slice(0, 120)).not.toContain(verdict);
    }
  });

  it("renders exactly the four present-in-either chips, matched first", () => {
    const chips = [...markup.matchAll(/<li class="mint-chip (matched|unmatched)">([^<]+)</g)];
    expect(chips.map((chip) => [chip[1], chip[2]])).toEqual([
      ["matched", "Doubled shape"],
      ["matched", "Length · 4 morae"],
      ["unmatched", "Heavy onset"],
      ["unmatched", "Vowel weight"],
    ]);
  });

  it("proves the arithmetic in the table twin, shared absences included", () => {
    expect(markup).toContain("View the full comparison");
    expect(markup).toContain("Sharp cut · Q");
    expect(markup).toContain("Nasal ending · N");
    expect(markup).toContain("-ri ending");
    expect(markup).toContain("0.50");
    // Seven feature rows, one per scorer feature.
    expect(markup.split("<tr>").length - 1).toBe(8);
  });

  it("never puts kana glyphs in the chrome chips", () => {
    const chipRow = markup.split('<ul class="mint-chips">')[1]?.split("</ul>")[0] ?? "";
    expect(chipRow).not.toMatch(/[぀-ヿ]/u);
  });
});

describe("MintStatusLine", () => {
  it("renders the frozen status line from API counts", () => {
    const markup = renderToStaticMarkup(
      <MintStatusLine index={12} totalProducible={94} mean={58} />,
    );
    expect(markup).toContain("Word ");
    expect(markup).toContain(" of ");
    expect(markup).toContain("94");
    expect(markup).toContain(" · your mean ");
    expect(markup).toContain("58");
  });

  it("omits the mean until the player has minted a word", () => {
    const markup = renderToStaticMarkup(
      <MintStatusLine index={1} totalProducible={94} mean={null} />,
    );
    expect(markup).not.toContain("your mean");
    expect(markup).toContain("94");
  });

  it("degrades rather than printing NaN when the backend omits the total", () => {
    const markup = renderToStaticMarkup(
      <MintStatusLine index={3} totalProducible={undefined} mean={40} />,
    );
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain(" of ");
    expect(markup).toContain("your mean");
  });
});

describe("classifySubmitError - the one-shot promise", () => {
  const parseFailure = new ApiError(400, "input: not speakable", {
    validationErrors: { input: "must segment into morae" },
  });

  it("keeps the attempt on the same word when the form does not parse", () => {
    const outcome = classifySubmitError(parseFailure);
    expect(outcome).toEqual({ kind: "keep-trying", parseError: true, message: "" });
  });

  it("never surfaces the backend's validation prose to the player", () => {
    const outcome = classifySubmitError(parseFailure);
    expect(JSON.stringify(outcome)).not.toContain("must segment into morae");
    expect(JSON.stringify(outcome)).not.toContain("input:");
  });

  it("advances past a word that was already minted", () => {
    const conflict = new ApiError(409, "already produced", {});
    expect(classifySubmitError(conflict)).toEqual({ kind: "advance" });
  });

  it("reports an expired session rather than eating the attempt", () => {
    const expired = new ApiError(401, "token expired", {});
    expect(classifySubmitError(expired)).toEqual({
      kind: "auth-expired",
      message: "token expired",
    });
  });

  it("keeps the attempt on any other failure, with a message but no parse error", () => {
    const offline = new ApiError(0, "Network request failed", null);
    expect(classifySubmitError(offline)).toEqual({
      kind: "keep-trying",
      parseError: false,
      message: "Network request failed",
    });
    // A 400 without validationErrors.input is not a parse failure.
    const other400 = new ApiError(400, "bad request", { message: "bad request" });
    expect(classifySubmitError(other400)).toMatchObject({
      kind: "keep-trying",
      parseError: false,
    });
  });
});

describe("MintDonePanel", () => {
  it("reports the player's own mean, and nothing about anyone else", () => {
    const markup = renderToStaticMarkup(
      <MintDonePanel mean={58} produced={94} onBackToHome={noop} />,
    );
    expect(markup).toContain("58");
    expect(markup).toContain("Back to modes");
    expect(markup).not.toContain("Arena");
  });

  it("omits the mean line when there is no data to average", () => {
    const markup = renderToStaticMarkup(
      <MintDonePanel mean={null} produced={0} onBackToHome={noop} />,
    );
    expect(markup).not.toContain("mean similarity");
  });
});
