import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { IdeophoneOption } from "../api/types";
import { getConditionPresentation } from "../conditionPresentation";
import StimulusDisplay from "./StimulusDisplay";

// Mirrors backend seed rows where displayForm cannot be derived from kana by
// per-character conversion (long-vowel ー normalization), the case the deleted
// heuristics inverted.
const mismatchOption: IdeophoneOption = {
  ideophoneId: 125,
  kana: "じゃあじゃあ",
  displayForm: "ジャージャー",
  canonicalForm: "じゃーじゃー",
  romaji: "zyaazyaa",
  canonicalScript: "HK",
};

const matchOption: IdeophoneOption = {
  ideophoneId: 62,
  kana: "かたかた",
  displayForm: "カタカタ",
  canonicalForm: "カタカタ",
  romaji: "katakata",
  canonicalScript: "KK",
};

function render(
  option: IdeophoneOption,
  conditionName: string,
  revealDetails = false,
  meaning?: string,
) {
  return renderToStaticMarkup(
    <StimulusDisplay
      meaning={meaning}
      option={option}
      positionLabel="A"
      presentation={getConditionPresentation(conditionName)}
      revealDetails={revealDetails}
    />,
  );
}

// Reads an element's text by its semantic hook (§5 stable-hook contract keeps
// the hook first in class), tolerant of appended utilities and extra
// attributes (e.g. lang="ja"). Replaces exact-markup matching per §11.2 while
// keeping the verbatim-kana assertion (the backend displayForm is rendered,
// never a client conversion).
function textOfHook(markup: string, hook: string): string {
  const at = markup.indexOf(`class="${hook}`);
  if (at === -1) return "";
  const open = markup.indexOf(">", at);
  const close = markup.indexOf("<", open + 1);
  return markup.slice(open + 1, close).trim();
}

describe("StimulusDisplay pre-answer rendering", () => {
  it("script-match renders the backend displayForm verbatim", () => {
    const markup = render(matchOption, "CONDITION_2_SOKUON");
    expect(textOfHook(markup, "script-display-text")).toBe("カタカタ");
  });

  it("script-mismatch renders the backend displayForm verbatim, not a kana conversion", () => {
    const markup = render(mismatchOption, "CONDITION_3_SOKUON");
    expect(textOfHook(markup, "script-display-text")).toBe("ジャージャー");
    expect(markup).not.toContain("ジャアジャア");
    expect(markup).not.toContain("じゃあじゃあ");
  });

  it("audio-only renders the neutral placeholder without script or romaji", () => {
    const markup = render(matchOption, "CONDITION_1_SOKUON");
    expect(markup).toContain("placeholder-display");
    expect(markup).toContain(">A<");
    expect(markup).not.toContain(matchOption.displayForm as string);
    expect(markup).not.toContain(matchOption.canonicalForm as string);
    expect(markup).not.toContain(matchOption.romaji as string);
  });
});

describe("StimulusDisplay feedback reveal", () => {
  it("renders canonicalForm, romaji, and meaning", () => {
    const markup = render(mismatchOption, "CONDITION_3_SOKUON", true, "noisily gushing");
    expect(textOfHook(markup, "script-display-text")).toBe("じゃーじゃー");
    expect(textOfHook(markup, "romaji-display-text")).toBe("zyaazyaa");
    expect(textOfHook(markup, "meaning-display-text")).toBe("noisily gushing");
  });

  it("reveals canonicalForm in the audio-only condition too", () => {
    const markup = render(matchOption, "CONDITION_1_SOKUON", true, "clattering, rattling");
    expect(textOfHook(markup, "script-display-text")).toBe("カタカタ");
    expect(textOfHook(markup, "romaji-display-text")).toBe("katakata");
  });
});
