// Deterministic seeded jitter for the raincloud raw dots (SPEC-stats-dashboard
// §3.4). Math.random is banned in this codebase — jitter must be reproducible
// so the SSR/renderToStaticMarkup tests are machine-independent and the same
// dot never hops between renders. Pure integer math (Math.imul / >>> 0): no
// floats-from-locale, identical on every machine. (Seeded determinism is also
// the project's shuffle ethos; N2's force layout will reuse this module.)

/** Hash a string into a 32-bit seed stream (xmur3). */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 13);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32: a uint32 seed → a generator producing values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stable jitter in [-1, 1) for one dot, keyed by its identity
 * (modality, rating value, index within that value's stack). The panel scales
 * this by half the tier band in px.
 */
export function jitterFor(
  modality: string,
  ratingValue: number,
  index: number,
): number {
  const draw = mulberry32(xmur3(`${modality}:${ratingValue}:${index}`)())();
  return draw * 2 - 1;
}
