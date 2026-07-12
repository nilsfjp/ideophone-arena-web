// Hand-rolled kernel density estimate for the scatter's marginal curves
// (SPEC-stats-dashboard §3.3: Epanechnikov, ~15 lines, no dependency).
// Curves are PEAK-normalized (max 1): the marginals communicate shape, not
// mass - sample sizes live in labels and margin notes, never in curve height.

/** Epanechnikov kernel: 0.75·(1 − u²) for |u| ≤ 1, else 0. */
export function epanechnikov(u: number): number {
  const a = Math.abs(u);
  return a <= 1 ? 0.75 * (1 - a * a) : 0;
}

/**
 * Silverman's rule of thumb, 0.9 · min(sd, iqr/1.34) · n^(−1/5), floored at
 * 4% of the domain span. The floor rescues n = 1 and zero-variance inputs
 * (sd = 0 would collapse the curve into a spike / divide-by-zero).
 */
export function silvermanBandwidth(values: number[], span: number): number {
  const floor = 0.04 * span;
  const n = values.length;
  if (n < 2) return floor;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(
    values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1),
  );
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = (q: number) => {
    const pos = (n - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  const iqr = quantile(0.75) - quantile(0.25);
  const spread = Math.min(sd, iqr / 1.34) || Math.max(sd, iqr / 1.34);
  return Math.max(0.9 * spread * n ** -0.2, floor);
}

export type KdePoint = { x: number; y: number };

/**
 * Density curve over an evenly spaced grid on [min, max], peak-normalized to
 * max 1. Empty input → empty curve (callers render nothing, not a flat line).
 */
export function kdeCurve(
  values: number[],
  opts: { min: number; max: number; steps?: number; bandwidth?: number },
): KdePoint[] {
  if (values.length === 0) return [];
  const { min, max, steps = 64 } = opts;
  const bw = opts.bandwidth ?? silvermanBandwidth(values, max - min);
  const curve: KdePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = min + ((max - min) * i) / steps;
    let density = 0;
    for (const v of values) density += epanechnikov((x - v) / bw);
    curve.push({ x, y: density / (values.length * bw) });
  }
  const peak = Math.max(...curve.map((p) => p.y));
  if (peak > 0) for (const p of curve) p.y /= peak;
  return curve;
}
