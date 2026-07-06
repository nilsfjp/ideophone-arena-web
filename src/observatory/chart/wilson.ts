// Wilson score interval for the scatter tooltips (SPEC-stats-dashboard §3.3:
// accuracy with a Wilson interval, computed client-side, hand-rolled).

export type Interval = { lo: number; hi: number };

/**
 * 95% Wilson score interval (z = 1.96) for a binomial proportion, clamped to
 * [0, 1]. n ≤ 0 → null (no data ≠ an interval around zero).
 */
export function wilsonInterval(
  successes: number,
  n: number,
  z = 1.96,
): Interval | null {
  if (n <= 0) return null;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    lo: Math.min(Math.max(center - margin, 0), 1),
    hi: Math.min(Math.max(center + margin, 0), 1),
  };
}

/**
 * The divergence endpoint reports a proportion, not raw successes; reconstruct
 * successes as round(p·n), clamped to [0, n] so a contract-violating p outside
 * [0, 1] degrades to a valid interval instead of a NaN CI in tooltips.
 * Sub-integer float drift is display-only here — the interval feeds tooltips,
 * never analysis.
 */
export function wilsonFromProportion(p: number, n: number): Interval | null {
  const successes = Math.min(Math.max(Math.round(p * n), 0), n);
  return wilsonInterval(successes, n);
}
