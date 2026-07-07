// Deterministic number formatting for chart labels and tooltips. Fixed
// output, no locale APIs — toLocaleString would make rendered markup (and the
// string-assertion tests) machine-dependent.

import type { Interval } from "./wilson";

/** 0.686 → "69%" (axis ticks, compact labels). */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** 0.686 → "68.6%" (printed dumbbell values, tooltips). */
export function formatPercentPrecise(fraction: number): string {
  const v = Math.round(fraction * 1000) / 10;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;
}

/** {lo: 0.61, hi: 0.757} → "61–76%". */
export function formatCI(interval: Interval): string {
  return `${Math.round(interval.lo * 100)}–${Math.round(interval.hi * 100)}%`;
}

/** 4.42 → "4.4 / 7" (native rating display, arena + thesis layers). */
export function formatRating7(rating: number): string {
  return `${(Math.round(rating * 10) / 10).toFixed(1)} / 7`;
}

/** 1.83 → "+1.8" · −0.4 → "−0.4" (z-axis ticks and crosshair labels). */
export function formatZ(z: number): string {
  const v = Math.round(z * 10) / 10;
  const abs = Math.abs(v).toFixed(1);
  return v > 0 ? `+${abs}` : v < 0 ? `−${abs}` : "0.0";
}

/** Plain integer count — no thousands separators (lab-notebook register). */
export function formatCount(count: number): string {
  return String(count);
}

/** 1.42 → "1.42" · −0.03 → "−0.03" (SDT d′/criterion readouts, U+2212 minus). */
export function formatFixed2(x: number): string {
  const v = Math.round(x * 100) / 100;
  const abs = Math.abs(v).toFixed(2);
  return v < 0 ? `−${abs}` : abs;
}
