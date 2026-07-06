// Thin d3-scale wrappers — d3 does math only, React owns the DOM (spec §5).
// Panels import from here, never from d3 directly.

import { scaleLinear, type ScaleLinear } from "d3-scale";

export type LinearScale = ScaleLinear<number, number>;

export function makeLinearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  return scaleLinear().domain(domain).range(range);
}

export const PERCENT_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * Dumbbell x-domain: [0.25, 1] by default (the interesting band around chance
 * and above), auto-extended downward in 0.05 steps when a tiny-n live value
 * dips below the floor — values are never clipped silently.
 */
export function dumbbellDomain(values: number[]): [number, number] {
  let lo = 0.25;
  const min = Math.min(...values);
  if (values.length > 0 && min < lo) {
    lo = Math.max(0, Math.floor(min * 20) / 20);
  }
  return [lo, 1];
}
