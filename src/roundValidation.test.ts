import { describe, expect, it } from "vitest";
import type { RoundResponse } from "./api/types";
import { getRoundProblem } from "./roundValidation";

function makeRound(overrides: Partial<RoundResponse> = {}): RoundResponse {
  return {
    sessionUuid: "session-1",
    roundId: 1,
    targetTranslation: "clattering, rattling",
    conditionName: "CONDITION_2_SOKUON",
    targetMeaningListedFirst: true,
    left: {
      ideophoneId: 61,
      kana: "ごそごそ",
      displayForm: "ごそごそ",
      canonicalForm: "ごそごそ",
      romaji: "gosogoso",
    },
    right: {
      ideophoneId: 62,
      kana: "かたかた",
      displayForm: "カタカタ",
      canonicalForm: "カタカタ",
      romaji: "katakata",
    },
    ...overrides,
  };
}

describe("getRoundProblem", () => {
  it("accepts a complete round", () => {
    const round = makeRound();
    expect(getRoundProblem(round, round.targetTranslation)).toBe("");
  });

  it("rejects a script-condition round missing displayForm", () => {
    const round = makeRound();
    delete round.right.displayForm;
    expect(getRoundProblem(round, round.targetTranslation)).toContain("displayForm");
  });

  it("rejects a blank displayForm the same as a missing one", () => {
    const round = makeRound();
    round.left.displayForm = "   ";
    expect(getRoundProblem(round, round.targetTranslation)).toContain("displayForm");
  });

  it("rejects any known condition missing canonicalForm", () => {
    const round = makeRound({ conditionName: "CONDITION_1_SOKUON" });
    delete round.left.canonicalForm;
    expect(getRoundProblem(round, round.targetTranslation)).toContain("canonicalForm");
  });

  it("accepts an audio-only round without displayForm when canonicalForm is present", () => {
    const round = makeRound({ conditionName: "CONDITION_1_SOKUON" });
    delete round.left.displayForm;
    delete round.right.displayForm;
    expect(getRoundProblem(round, round.targetTranslation)).toBe("");
  });

  it("keeps the existing identity checks", () => {
    const round = makeRound({ roundId: 0 });
    expect(getRoundProblem(round, round.targetTranslation)).toContain("roundId");
    expect(getRoundProblem(makeRound(), "")).toContain("targetTranslation");
    const noChoice = makeRound();
    noChoice.left.ideophoneId = 0;
    expect(getRoundProblem(noChoice, noChoice.targetTranslation)).toContain(
      "ideophone choices",
    );
  });
});
