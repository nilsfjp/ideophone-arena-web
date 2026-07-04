import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our @theme (spec §3) adds non-standard font-size names — text-ui, text-md,
// and the trial/kana/hero roles. tailwind-merge does not know them, so out of
// the box it treats `text-ui` (a size) and `text-ink-inverse` (a color) as the
// same `text-*` conflict group and drops one — black-holing button text color.
// Registering the custom sizes under `font-size` puts sizes and colors in
// separate groups, so a variant's color and size both survive the merge.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "ui",
            "md",
            "prompt",
            "question",
            "kana-card",
            "kana-feedback",
            "kana-hero",
            "hero",
            "xl-form",
          ],
        },
      ],
    },
  },
});

/**
 * `cn` — the shadcn/CVA class composer. Merges conditional class values
 * (clsx) and resolves Tailwind utility conflicts (tailwind-merge, taught our
 * custom font-size roles above).
 *
 * Stable-hook contract (spec §5): when composing an experiment/chrome surface
 * that the proof battery pins, pass the semantic hook FIRST so it stays the
 * first class token — e.g. cn("ideophone-card", ...variants).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
