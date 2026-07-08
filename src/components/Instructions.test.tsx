import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Instructions from "./Instructions";

function renderInstructions(
  overrides: Partial<Parameters<typeof Instructions>[0]> = {},
) {
  return renderToStaticMarkup(
    <Instructions
      includePractice={true}
      isStarting={false}
      selectedCondition="CONDITION_1_SOKUON"
      soundCheckStatus="idle"
      onConditionChange={() => undefined}
      onIncludePracticeChange={() => undefined}
      onSoundCheck={() => undefined}
      onStart={() => undefined}
      {...overrides}
    />,
  );
}

describe("Instructions", () => {
  it("renders the three Script Lab condition options", () => {
    const markup = renderInstructions();
    expect(markup).toContain("Audio only");
    expect(markup).toContain("Script match");
    expect(markup).toContain("Script mismatch");
  });

  it("renders the practice toggle with its exact label", () => {
    const markup = renderInstructions();
    expect(markup).toContain("Include 2 practice rounds (not scored)");
  });

  it("gates Start Game on the sound check", () => {
    // The shadcn Button carries `disabled:` utility classes, so assert the
    // disabled ATTRIBUTE (disabled="") rather than the substring "disabled".
    const idleStart = renderInstructions({ soundCheckStatus: "idle" })
      .split("<button")
      .find((chunk) => chunk.includes("Start Game"));
    expect(idleStart).toContain('disabled=""');

    const readyStart = renderInstructions({ soundCheckStatus: "ready" })
      .split("<button")
      .find((chunk) => chunk.includes("Start Game"));
    expect(readyStart).not.toContain('disabled=""');
  });

  it("renders Back to modes only when onBackToHome is provided", () => {
    expect(renderInstructions()).not.toContain("Back to modes");
    expect(
      renderInstructions({ onBackToHome: () => undefined }),
    ).toContain("Back to modes");
  });
});
