import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — the shadcn/CVA class composer. Merges conditional class values
 * (clsx) and resolves Tailwind utility conflicts (stock tailwind-merge).
 *
 * The custom §3 font-size roles are no longer named utilities (§16 H4), so
 * stock tailwind-merge suffices: sizes now ship as arbitrary-length utilities
 * (text-[length:var(--text-ui)]), which it classifies as font-size — a group
 * distinct from text color, so a variant's color and size both survive.
 *
 * Stable-hook contract (spec §5): when composing an experiment/chrome surface
 * that the proof battery pins, pass the semantic hook FIRST so it stays the
 * first class token — e.g. cn("ideophone-card", ...variants).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
