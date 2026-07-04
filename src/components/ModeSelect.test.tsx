import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MODES } from "../modes";
import ModeSelect from "./ModeSelect";

function countOccurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe("ModeSelect", () => {
  const markup = renderToStaticMarkup(
    <ModeSelect modes={MODES} onSelect={() => undefined} />,
  );

  it("renders one card per registered mode", () => {
    expect(countOccurrences(markup, "<button")).toBe(3);
    expect(markup).toContain("Meaning Match");
    expect(markup).toContain("Rating Lab");
    expect(markup).toContain("Perception Ladder");
  });

  it("keeps the playable mode cards enabled", () => {
    for (const title of ["Meaning Match", "Rating Lab"]) {
      const card = markup
        .split("<button")
        .find((chunk) => chunk.includes(title));
      expect(card).toBeDefined();
      expect(card).not.toContain("disabled");
      expect(card).not.toContain("Coming soon");
    }
  });

  it("marks coming-soon modes as disabled with an honest badge", () => {
    for (const title of ["Perception Ladder"]) {
      const card = markup
        .split("<button")
        .find((chunk) => chunk.includes(title));
      expect(card).toBeDefined();
      expect(card).toContain("disabled");
      expect(card).toContain('aria-disabled="true"');
      expect(card).toContain("Coming soon");
    }
  });
});
