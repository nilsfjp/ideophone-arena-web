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
    expect(countOccurrences(markup, "<button")).toBe(MODES.length);
    expect(markup).toContain("Meaning Match");
    expect(markup).toContain("Rating Lab");
    expect(markup).toContain("Perception Ladder");
    expect(markup).toContain("Word Mint");
  });

  it("keeps the playable mode cards enabled", () => {
    for (const title of [
      "Meaning Match",
      "Rating Lab",
      "Perception Ladder",
      "Word Mint",
    ]) {
      const card = markup
        .split("<button")
        .find((chunk) => chunk.includes(title));
      expect(card).toBeDefined();
      expect(card).not.toContain("disabled");
      expect(card).not.toContain("Coming soon");
    }
  });

  // Every registered mode is now available, so exercise the coming-soon path
  // with a synthetic entry to keep the disabled-card rendering covered.
  it("marks a coming-soon mode as disabled with an honest badge", () => {
    const soonMarkup = renderToStaticMarkup(
      <ModeSelect
        modes={[
          {
            id: "ladder",
            title: "Future Mode",
            measure: "Journey · Perception",
            status: "coming-soon",
            description: "Not yet available.",
          },
        ]}
        onSelect={() => undefined}
      />,
    );
    const card = soonMarkup
      .split("<button")
      .find((chunk) => chunk.includes("Future Mode"));
    expect(card).toBeDefined();
    expect(card).toContain("disabled");
    expect(card).toContain('aria-disabled="true"');
    expect(card).toContain("Coming soon");
  });
});
