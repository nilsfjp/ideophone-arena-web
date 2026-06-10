import { describe, expect, it } from "vitest";
import {
  CHOICE_QUESTION_PREFIX,
  LISTEN_INSTRUCTION,
  MEANING_OTHER_PREFIX,
  MEANING_TARGET_PREFIX,
} from "./experimentText";

const FROZEN_PHRASES = [
  LISTEN_INSTRUCTION,
  MEANING_TARGET_PREFIX,
  MEANING_OTHER_PREFIX,
  CHOICE_QUESTION_PREFIX,
];

const sourceFiles = import.meta.glob("./**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("frozen trial text lives only in experimentText.ts", () => {
  // Invariant 1: src/experimentText.ts is the single home of participant-facing
  // trial strings. Components must import them, never inline them.
  it("no component contains an inline copy of a frozen phrase", () => {
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(sourceFiles)) {
      if (/\.test\.(ts|tsx)$/.test(path) || path === "./experimentText.ts") {
        continue;
      }
      for (const phrase of FROZEN_PHRASES) {
        if (text.includes(phrase)) {
          offenders.push(`${path}: "${phrase}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
