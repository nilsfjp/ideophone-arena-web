import { describe, expect, it } from "vitest";
import type { FeatureMatch } from "./api/types";
import {
  MINT_BAND_ALMOST,
  MINT_BAND_DIFFERENT,
  MINT_BAND_MOST,
  MINT_BAND_SOME,
} from "./experimentText";
import {
  chipLabel,
  chipsFor,
  featureTableLabel,
  featureTableValue,
  isMintInputWellFormed,
  normalizeMintInput,
  scoreBandTail,
} from "./productionScore";

// The adjudicated worked example: player types "pikapika" against dokidoki (i9),
// scoring 78 under the section 5 v1 weights. This is the exact `features` payload
// the backend returns, in the frozen 8.3 order.
const PIKAPIKA_VS_DOKIDOKI: FeatureMatch[] = [
  { feature: "redup", yours: true, target: true, matched: true },
  { feature: "sokuon", yours: false, target: false, matched: true },
  { feature: "finalN", yours: false, target: false, matched: true },
  { feature: "riSuffix", yours: false, target: false, matched: true },
  { feature: "voicedOnset", yours: false, target: true, matched: false },
  { feature: "heavyVowelRatio", yours: 0.0, target: 0.5, matched: false },
  { feature: "moraCount", yours: 4, target: 4, matched: true },
];

describe("scoreBandTail", () => {
  it("bands at the frozen boundaries", () => {
    expect(scoreBandTail(100)).toBe(MINT_BAND_ALMOST);
    expect(scoreBandTail(85)).toBe(MINT_BAND_ALMOST);
    expect(scoreBandTail(84)).toBe(MINT_BAND_MOST);
    expect(scoreBandTail(60)).toBe(MINT_BAND_MOST);
    expect(scoreBandTail(59)).toBe(MINT_BAND_SOME);
    expect(scoreBandTail(35)).toBe(MINT_BAND_SOME);
    expect(scoreBandTail(34)).toBe(MINT_BAND_DIFFERENT);
    expect(scoreBandTail(0)).toBe(MINT_BAND_DIFFERENT);
  });

  it("puts the worked example in the 60-84 band", () => {
    expect(scoreBandTail(78)).toBe(MINT_BAND_MOST);
  });
});

describe("chipsFor", () => {
  it("shows exactly the four chips of the worked example", () => {
    expect(chipsFor(PIKAPIKA_VS_DOKIDOKI).map(chipLabel)).toEqual([
      "Doubled shape",
      "Length · 4 morae",
      "Heavy onset",
      "Vowel weight",
    ]);
  });

  it("suppresses shared absences", () => {
    // sokuon, finalN and riSuffix all match — as absences in both forms. A row of
    // green chips celebrating what neither word has would read as noise.
    const shown = chipsFor(PIKAPIKA_VS_DOKIDOKI).map((match) => match.feature);
    expect(shown).not.toContain("sokuon");
    expect(shown).not.toContain("finalN");
    expect(shown).not.toContain("riSuffix");
  });

  it("keeps a boolean feature present in only the target", () => {
    const shown = chipsFor(PIKAPIKA_VS_DOKIDOKI).map((match) => match.feature);
    expect(shown).toContain("voicedOnset");
  });

  it("always keeps the two continuous features, even when both are zero", () => {
    const allAbsent: FeatureMatch[] = [
      { feature: "redup", yours: false, target: false, matched: true },
      { feature: "sokuon", yours: false, target: false, matched: true },
      { feature: "finalN", yours: false, target: false, matched: true },
      { feature: "riSuffix", yours: false, target: false, matched: true },
      { feature: "voicedOnset", yours: false, target: false, matched: true },
      { feature: "heavyVowelRatio", yours: 0.0, target: 0.0, matched: true },
      { feature: "moraCount", yours: 2, target: 2, matched: true },
    ];
    expect(chipsFor(allAbsent).map((match) => match.feature)).toEqual([
      "heavyVowelRatio",
      "moraCount",
    ]);
  });

  it("orders matched chips before unmatched ones", () => {
    const matchedFlags = chipsFor(PIKAPIKA_VS_DOKIDOKI).map((match) => match.matched);
    expect(matchedFlags).toEqual([true, true, false, false]);
  });

  it("interpolates YOUR mora count into the length chip", () => {
    const lengthChip: FeatureMatch = {
      feature: "moraCount",
      yours: 3,
      target: 5,
      matched: false,
    };
    expect(chipLabel(lengthChip)).toBe("Length · 3 morae");
  });
});

describe("the comparison table twin", () => {
  it("labels the mora row with the bare noun and moves the count to the value", () => {
    const lengthRow = PIKAPIKA_VS_DOKIDOKI[6];
    expect(featureTableLabel(lengthRow)).toBe("Length");
    expect(featureTableValue("moraCount", lengthRow.yours)).toBe("4 morae");
  });

  it("renders booleans as yes/no and the ratio at wire scale", () => {
    expect(featureTableValue("redup", true)).toBe("yes");
    expect(featureTableValue("sokuon", false)).toBe("no");
    expect(featureTableValue("heavyVowelRatio", 0.5)).toBe("0.50");
    expect(featureTableValue("heavyVowelRatio", 0)).toBe("0.00");
  });

  it("carries all seven features, shared absences included", () => {
    expect(PIKAPIKA_VS_DOKIDOKI.map(featureTableLabel)).toEqual([
      "Doubled shape",
      "Sharp cut · Q",
      "Nasal ending · N",
      "-ri ending",
      "Heavy onset",
      "Vowel weight",
      "Length",
    ]);
  });
});

describe("mint input mirror-validation", () => {
  it("accepts plain roman letters", () => {
    expect(isMintInputWellFormed("pikapika")).toBe(true);
    expect(isMintInputWellFormed("ka")).toBe(true);
  });

  it("accepts what a mobile keyboard auto-capitalises", () => {
    // The server trims and lowercases before parsing, so rejecting "Pikapika"
    // client-side would invent a parse error the backend would never raise.
    expect(isMintInputWellFormed("Pikapika")).toBe(true);
    expect(isMintInputWellFormed("  PIKA  ")).toBe(true);
    expect(normalizeMintInput("  Pikapika ")).toBe("pikapika");
  });

  it("rejects non-letters, and forms outside 2-24 characters", () => {
    expect(isMintInputWellFormed("pika pika!")).toBe(false);
    expect(isMintInputWellFormed("p")).toBe(false);
    expect(isMintInputWellFormed("")).toBe(false);
    expect(isMintInputWellFormed("a".repeat(25))).toBe(false);
    expect(isMintInputWellFormed("a".repeat(24))).toBe(true);
  });
});
