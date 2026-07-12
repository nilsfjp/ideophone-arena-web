// Observatory E1 figure-export generator (NIL-81).
//
// Static, poster-grade exports of the committed Observatory v1.0 (ab04469),
// rendered from the SAME vendored data the live panels read - no invented
// numbers. Emits self-contained SVGs; a sibling rasterizer (render.sh) turns
// them into the PNGs that ship to public/ and docs/design/observatory-figures/.
//
// Binding constraints honored here:
//   - Palette = UI-SYSTEM §4.1 tokens (raw hex mirrored from src/styles/
//     tokens.css). --vermillion is ARENA DATA ONLY; the live arena layer is
//     empty in a static export, so nothing is plotted in vermillion - it
//     appears solely as the §10.6 wave-rule identity motif.
//   - Divergence framing: "the two measures see different things", never
//     "orthogonal".
//   - CC BY attribution baked into every figure that uses a McLean / thesis
//     layer, string-matching the Observatory footer (Observatory.tsx).
//
// Fonts: the brand faces (Zen Maru Gothic / LINE Seed JP) are woff2-only and
// the render host has no woff2->ttf tooling, so figures render in the host's
// Adwaita Sans (display/body) + JetBrainsMono (specimen/mono) - a clean
// lab-instrument voice. Re-render with the brand faces installed for the
// final brand pass if desired; layout is unchanged.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "..", "..", "src", "data", "observatory");
const OUT = process.argv[2] || join(HERE, "svg");

const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const thesis = read("thesis-pairs.json");
const mclean = read("mclean.json");
const norms = read("norms.json");

// Verified canonical kana forms - from the backend seed (authoritative
// displayForm source): ideophone-arena-api `db/init/ideophone_arena.sql`,
// `canonical_form` / `canonical_script` columns. NOT fabricated: script choice
// (hiragana vs katakana) is the thesis's own variable, so kana is only ever
// lifted verbatim from the seed, never guessed (invariant 1). romaji-keyed.
const KANA = {
  kirakira: { canonical: "キラキラ", script: "katakana" },
  sukkiri: { canonical: "すっきり", script: "hiragana" },
};

// ---- palette (mirror of src/styles/tokens.css, raw hex) --------------------
const C = {
  page: "#e8e3d9",
  card: "#fbf8f2",
  raised: "#ffffff",
  ink: "#211e19",
  inkMuted: "#5e5749",
  inkInverse: "#fbf8f2",
  vermillion: "#c8401f",
  borderMid: "#867f70",
  borderSoft: "#c9c2b4",
  auditory: "#8a5512",
  visual: "#99454f",
  interoceptive: "#386376",
  auditorySoft: "#ebd7b0",
  visualSoft: "#e9c4c7",
  interoceptiveSoft: "#b9d3dc",
};
// Brand faces (tokens.css): display = Zen Maru Gothic, body/specimen = LINE
// Seed JP. Installed to fontconfig from the vendored @fontsource woff subsets.
// Specimen labels use the body face uppercased + tracked, exactly as the
// shipped Observatory panels do (no monospace in the brand).
const FONT = "Zen Maru Gothic, sans-serif"; // display / headings / big values
const BODY = "LINE Seed JP, sans-serif"; // body copy, labels, ticks
const MONO = BODY; // specimen/tick voice = brand body face

// ---- tiny svg helpers ------------------------------------------------------
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}="${typeof v === "number" ? +v.toFixed(3) : v}"`)
    .join(" ");
const el = (tag, o, kids = "") =>
  kids === null ? `<${tag} ${attrs(o)}/>` : `<${tag} ${attrs(o)}>${kids}</${tag}>`;
const rect = (o) => el("rect", o, null);
const line = (o) => el("line", o, null);
const circle = (o) => el("circle", o, null);
const path = (o) => el("path", o, null);
function text(x, y, s, o = {}) {
  const { font = BODY, size = 16, weight = 400, fill = C.ink, anchor = "start",
    spacing, transform, opacity } = o;
  return el("text", {
    x, y, "font-family": font, "font-size": size, "font-weight": weight,
    fill, "text-anchor": anchor, "letter-spacing": spacing, transform,
    "fill-opacity": opacity,
  }, esc(s));
}
// uppercase tracked specimen label (mono)
const spec = (x, y, s, o = {}) =>
  text(x, y, s.toUpperCase(), { font: BODY, weight: 700, size: 13, fill: C.inkMuted, spacing: "0.1em", ...o });

// The §10.6 seismograph wave-rule - form depicting sound. Identity motif.
function waveRule(x, y, scale = 1, stroke = C.vermillion, w = 2) {
  const pts = [[0,7],[34,7],[42,2],[52,12],[62,3],[72,11],[82,5],[90,9],[98,7],[160,7]]
    .map(([px, py]) => `${x + px * scale},${y + py * scale}`).join(" ");
  return el("polyline", { points: pts, fill: "none", stroke,
    "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" });
}

const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

// gaussian KDE, normalized to peak 1 (matches the app's marginal intent)
function kde(values, min, max, steps = 72) {
  const n = values.length;
  if (!n) return [];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || (max - min) / 8;
  const h = 1.06 * sd * Math.pow(n, -1 / 5) || (max - min) / 20;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = min + ((max - min) * i) / steps;
    let d = 0;
    for (const v of values) { const u = (x - v) / h; d += Math.exp(-0.5 * u * u); }
    pts.push({ x, y: d / (n * h * Math.sqrt(2 * Math.PI)) });
  }
  const mx = Math.max(...pts.map((p) => p.y)) || 1;
  return pts.map((p) => ({ x: p.x, y: p.y / mx }));
}

function svg(w, h, body, bg = C.page) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${rect({ width: w, height: h, fill: bg })}
${body}
</svg>`;
}

// A washi "card" surface (paper card, hairline border, no shadow - §1).
const cardRect = (x, y, w, h, fill = C.card, r = 14) =>
  rect({ x, y, width: w, height: h, rx: r, fill, stroke: C.borderSoft, "stroke-width": 1.25 });

// ---- attribution lines (must string-match Observatory.tsx footer) ----------
const ATTR_THESIS = "Paulsson (2026), MA thesis: the study this arena replicates (30 pairs, 36 participants).";
const ATTR_MCLEAN = "McLean, Dunn & Dingemanse (2023), Two measures are better than one: the 304-item backdrop, data CC BY 4.0.";
const ATTR_IIDA = "Iida & Akita (2023), perceptual strength norms for 510 Japanese words.";
const DIVERGENCE = "The two measures see different things: ρ ≈ +.44 overall, +.65 within ideophones (McLean, Dunn & Dingemanse 2023).";

// ===========================================================================
// FIGURE: dumbbell - "The claim" (accuracy by modality)
// ===========================================================================
function figureDumbbell(W = 1600, H = 980) {
  const pad = 72;
  const rows = [
    { key: "auditory", label: "Sound · auditory", color: C.auditory, ...thesis.byModality.auditory },
    { key: "visual", label: "Sight · visual", color: C.visual, ...thesis.byModality.visual },
    { key: "interoceptive", label: "Inner states · interoceptive", color: C.interoceptive, ...thesis.byModality.interoceptive },
  ];
  let b = "";
  // header
  b += spec(pad, 84, "The claim · guessing by modality");
  b += text(pad, 150, "Sound carries furthest", { font: FONT, weight: 700, size: 62 });
  b += waveRule(pad, 172, 1.1);
  b += text(pad, 250, "In the thesis, 2AFC guessing slid as meanings turned inward:", { size: 27, fill: C.inkMuted });
  b += text(pad, 288, "sound (68.6%) → sight (64.2%) → inner states (59.7%).", { size: 27, fill: C.inkMuted });

  // chart card
  const cx = pad, cy = 340, cw = W - pad * 2, ch = H - cy - 132;
  b += cardRect(cx, cy, cw, ch);
  const plotL = cx + 300, plotR = cx + cw - 150;
  const x = lin(0.45, 0.75, plotL, plotR);
  const axisY = cy + ch - 58;
  const rowTop = cy + 96, rowStep = (axisY - rowTop - 40) / rows.length;

  // chance hairline
  b += line({ x1: x(0.5), y1: cy + 40, x2: x(0.5), y2: axisY, stroke: C.borderMid, "stroke-dasharray": "5 5" });
  b += spec(x(0.5), cy + 30, "Chance · 50%", { anchor: "middle", size: 12 });

  rows.forEach((r, i) => {
    const ry = rowTop + i * rowStep + rowStep / 2;
    b += spec(cx + 40, ry - 6, r.label, { size: 15 });
    b += spec(cx + 40, ry + 22, `N = ${r.n}`, { size: 13, fill: C.borderMid });
    // lollipop stem chance->accuracy
    b += line({ x1: x(0.5), y1: ry, x2: x(r.accuracy), y2: ry, stroke: r.color, "stroke-width": 6, "stroke-linecap": "round", "stroke-opacity": 0.85 });
    b += circle({ cx: x(0.5), cy: ry, r: 6, fill: C.card, stroke: C.borderMid, "stroke-width": 2 });
    b += circle({ cx: x(r.accuracy), cy: ry, r: 15, fill: r.color, stroke: C.card, "stroke-width": 2.5 });
    b += text(x(r.accuracy) + 30, ry + 9, `${(r.accuracy * 100).toFixed(1)}%`, { font: FONT, weight: 700, size: 30, fill: C.ink });
  });

  // x axis
  b += line({ x1: plotL, y1: axisY, x2: plotR, y2: axisY, stroke: C.borderSoft });
  [0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75].forEach((t) => {
    b += line({ x1: x(t), y1: axisY, x2: x(t), y2: axisY + 7, stroke: C.borderMid });
    b += text(x(t), axisY + 28, `${Math.round(t * 100)}%`, { font: MONO, size: 13, fill: C.inkMuted, anchor: "middle" });
  });
  b += spec((plotL + plotR) / 2, axisY + 50, "Guessing accuracy · % correct", { anchor: "middle", size: 12 });

  // footer
  const fy = H - 66;
  b += line({ x1: pad, y1: fy - 22, x2: W - pad, y2: fy - 22, stroke: C.borderSoft });
  b += spec(pad, fy, "Ideophone Arena · The Observatory", { size: 13, fill: C.ink });
  b += text(W - pad, fy - 2, ATTR_THESIS, { size: 16, fill: C.inkMuted, anchor: "end" });
  b += text(W - pad, fy + 22, "Bars run from chance (50%) to the study mean; N = per-modality guesses across 10 pairs.", { size: 14, fill: C.borderMid, anchor: "end" });
  return svg(W, H, b);
}

// ===========================================================================
// FIGURE: divergence scatter - "The two measures"
// ===========================================================================
function scatterCore(ox, oy, plotW, plotH, opts = {}) {
  const ideo = mclean.items.filter((i) => i.stratum === "ideophone");
  const pros = mclean.items.filter((i) => i.stratum === "prosaic");
  const allZ = [...mclean.items.map((i) => i.ratingZ), ...thesis.pairs.map((p) => p.meanRatingZ)];
  const zMin = Math.min(-2.2, ...allZ) - 0.3;
  const zMax = Math.max(2.2, ...allZ) + 0.3;
  const x = lin(0, 1, ox, ox + plotW);
  const y = lin(zMin, zMax, oy + plotH, oy);
  let b = "";

  // gridlines + axes
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    b += line({ x1: x(t), y1: oy, x2: x(t), y2: oy + plotH, stroke: C.borderSoft, "stroke-opacity": 0.7 });
    b += text(x(t), oy + plotH + 26, `${Math.round(t * 100)}%`, { font: MONO, size: 13, fill: C.inkMuted, anchor: "middle" });
  });
  [-2, -1, 0, 1, 2].filter((t) => t > zMin && t < zMax).forEach((t) => {
    b += line({ x1: ox, y1: y(t), x2: ox + plotW, y2: y(t), stroke: C.borderSoft, "stroke-opacity": 0.7 });
    b += text(ox - 14, y(t) + 5, t > 0 ? `+${t}` : `${t}`, { font: MONO, size: 13, fill: C.inkMuted, anchor: "end" });
  });
  // chance line
  b += line({ x1: x(0.5), y1: oy, x2: x(0.5), y2: oy + plotH, stroke: C.borderMid, "stroke-dasharray": "5 5" });

  // marginal densities (top = x, right = y) when room allows
  if (opts.marginals) {
    const mh = opts.marginals; // px band height
    const layers = [
      { xs: ideo.map((i) => i.guessScore), zs: ideo.map((i) => i.ratingZ), stroke: C.inkMuted, fill: C.inkMuted, dash: "" },
      { xs: pros.map((i) => i.guessScore), zs: pros.map((i) => i.ratingZ), stroke: C.borderMid, fill: C.borderMid, dash: "4 3" },
      { xs: thesis.pairs.map((p) => p.accuracy), zs: thesis.pairs.map((p) => p.meanRatingZ), stroke: C.ink, fill: C.ink, dash: "" },
    ];
    // top band
    layers.forEach((L) => {
      const k = kde(L.xs, 0, 1);
      if (!k.length) return;
      const base = oy - 10;
      const d = "M" + k.map((p) => `${x(p.x)},${base - p.y * (mh - 8)}`).join(" L") +
        ` L${x(1)},${base} L${x(0)},${base} Z`;
      b += path({ d, fill: L.fill, "fill-opacity": 0.14, stroke: L.stroke, "stroke-width": 1.5, "stroke-dasharray": L.dash });
    });
    // right band
    layers.forEach((L) => {
      const k = kde(L.zs, zMin, zMax);
      if (!k.length) return;
      const base = ox + plotW + 10;
      const d = "M" + k.map((p) => `${base + p.y * (mh - 8)},${y(p.x)}`).join(" L") +
        ` L${base},${y(zMax)} L${base},${y(zMin)} Z`;
      b += path({ d, fill: L.fill, "fill-opacity": 0.14, stroke: L.stroke, "stroke-width": 1.5, "stroke-dasharray": L.dash });
    });
  }

  // McLean prosaic squares (backdrop)
  pros.forEach((i) => {
    const s = 5;
    b += rect({ x: x(i.guessScore) - s / 2, y: y(i.ratingZ) - s / 2, width: s, height: s, fill: C.borderMid, "fill-opacity": 0.55 });
  });
  // McLean ideophone circles
  ideo.forEach((i) => {
    b += circle({ cx: x(i.guessScore), cy: y(i.ratingZ), r: 3, fill: C.inkMuted, "fill-opacity": 0.5 });
  });
  // thesis pairs (ink)
  thesis.pairs.forEach((p) => {
    b += circle({ cx: x(p.accuracy), cy: y(p.meanRatingZ), r: 5, fill: C.ink, stroke: C.card, "stroke-width": 1.5 });
  });
  return b;
}

function scatterLegend(x, y, size = 15) {
  let b = "";
  const gap = 34;
  b += circle({ cx: x, cy: y - 5, r: 4, fill: C.inkMuted, "fill-opacity": 0.5 });
  b += text(x + 12, y, "Ideophone · McLean 2023", { size, fill: C.inkMuted });
  b += rect({ x: x + 300 - 4, y: y - 9, width: 8, height: 8, fill: C.borderMid, "fill-opacity": 0.55 });
  b += text(x + 300 + 12, y, "Prosaic · McLean 2023", { size, fill: C.inkMuted });
  b += circle({ cx: x + 570, cy: y - 5, r: 5, fill: C.ink });
  b += text(x + 570 + 12, y, "Thesis pairs (30)", { size, fill: C.ink });
  return b;
}

function figureScatter(W = 1400, H = 1320) {
  const pad = 72;
  let b = "";
  b += spec(pad, 84, "The two measures · 334 words");
  b += text(pad, 150, "Two measures, two stories", { font: FONT, weight: 700, size: 60 });
  b += waveRule(pad, 172, 1.1);
  b += text(pad, 248, "Ratings separate ideophones from prosaic words; guessing doesn’t.", { size: 26, fill: C.inkMuted });
  b += text(pad, 284, "Each mark is one word; the backdrop is McLean 2023’s 304 items,", { size: 26, fill: C.inkMuted });
  b += text(pad, 320, "the ink dots the 30 thesis pairs.", { size: 26, fill: C.inkMuted });

  // chart card
  const cx = pad, cy = 356, cw = W - pad * 2, ch = H - cy - 176;
  b += cardRect(cx, cy, cw, ch);
  b += scatterLegend(cx + 44, cy + 44);
  // axis titles - plotT leaves headroom for the top marginal band below the legend
  const plotL = cx + 96, plotT = cy + 116, plotW = cw - 200, plotH = ch - 262;
  b += scatterCore(plotL, plotT, plotW, plotH, { marginals: 46 });
  b += spec(plotL + plotW / 2, plotT + plotH + 58, "Accuracy · % correct", { anchor: "middle", size: 12 });
  b += spec(cx + 30, plotT + plotH / 2, "Rating · z within study", { anchor: "middle", size: 12, transform: `rotate(-90 ${cx + 30} ${plotT + plotH / 2})` });
  // divergence note inside card
  b += text(cx + 44, cy + ch - 30, DIVERGENCE, { size: 16, fill: C.inkMuted });

  // footer
  const fy = H - 74;
  b += line({ x1: pad, y1: fy - 26, x2: W - pad, y2: fy - 26, stroke: C.borderSoft });
  b += spec(pad, fy - 2, "Ideophone Arena · The Observatory", { size: 13, fill: C.ink });
  b += text(W - pad, fy - 4, ATTR_MCLEAN, { size: 15, fill: C.inkMuted, anchor: "end" });
  b += text(W - pad, fy + 20, ATTR_THESIS, { size: 15, fill: C.inkMuted, anchor: "end" });
  b += text(pad, fy + 20, "Each layer standardized within its own study; compare within a layer, not across.", { size: 14, fill: C.borderMid });
  return svg(W, H, b);
}

// ===========================================================================
// FIGURE: word radar - "The fingerprint" (Iida & Akita perceptual profiles)
// Faithful to WordRadar.tsx: six axes (aud/vis/hap/gus/olf/int in the panel's
// re-slotted display order), two ideophones as ink solid vs ink-muted dashed
// polygons. Reference data - no vermillion, no modality-trio colors (the axes
// ARE the modalities). Verified canonical kana on the chips (KANA, from seed).
// ===========================================================================
const RADAR_AXES = [
  { i: 0, label: "Auditory", angle: -90 },
  { i: 1, label: "Visual", angle: -30 },
  { i: 3, label: "Gustatory", angle: 30 },
  { i: 5, label: "Interoceptive", angle: 90 },
  { i: 4, label: "Olfactory", angle: 150 },
  { i: 2, label: "Haptic", angle: 210 },
];
const rvtx = (cx, cy, r, ang, val) => {
  const rad = (ang * Math.PI) / 180, rr = (val / 5) * r;
  return [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)];
};
const rpoly = (w, cx, cy, r) =>
  RADAR_AXES.map((a) => rvtx(cx, cy, r, a.angle, w.axes[a.i]).join(",")).join(" ");

function radarChip(x, y, dash, kana, romaji, gloss) {
  let b = line({ x1: x, y1: y - 7, x2: x + 34, y2: y - 7, stroke: dash ? C.inkMuted : C.ink,
    "stroke-width": 2.5, "stroke-dasharray": dash ? "6 4" : "" });
  b += text(x + 48, y, kana, { font: BODY, weight: 700, size: 27, fill: C.ink });
  b += text(x + 48 + 130, y, `${romaji} · ${gloss}`, { size: 17, fill: C.inkMuted });
  return b;
}

function figureRadar(W = 1200, H = 1320) {
  const pad = 72;
  const A = norms.words.find((w) => w.word === "kirakira");
  const B = norms.words.find((w) => w.word === "sukkiri");
  let b = "";
  b += spec(pad, 84, "The fingerprint · perceptual profiles");
  b += text(pad, 150, "A word’s six senses", { font: FONT, weight: 700, size: 60 });
  b += waveRule(pad, 172, 1.1);
  b += text(pad, 248, "Every normed word carries a profile across six perceptual axes:", { size: 26, fill: C.inkMuted });
  b += text(pad, 284, "how strongly it evokes each sense. Two ideophones, two shapes.", { size: 26, fill: C.inkMuted });

  const cx0 = pad, cy0 = 356, cw = W - pad * 2, ch = H - cy0 - 132;
  b += cardRect(cx0, cy0, cw, ch);
  // legend chips (verified canonical kana + romaji + gloss)
  b += radarChip(cx0 + 44, cy0 + 52, false, KANA.kirakira.canonical, "kirakira", A.arena.gloss);
  b += radarChip(cx0 + 44, cy0 + 90, true, KANA.sukkiri.canonical, "sukkiri", B.arena.gloss);

  const cx = cx0 + cw / 2, cy = cy0 + ch / 2 + 44, radius = 290;
  // rings 1..5
  for (let ring = 1; ring <= 5; ring++) {
    const pts = RADAR_AXES.map((a) => rvtx(cx, cy, radius, a.angle, ring).join(",")).join(" ");
    b += el("polygon", { points: pts, fill: "none", stroke: C.borderSoft, "stroke-width": 1 });
  }
  // spokes + axis labels
  RADAR_AXES.forEach((a) => {
    const [sx, sy] = rvtx(cx, cy, radius, a.angle, 5);
    const [lx, ly] = rvtx(cx, cy, radius + 30, a.angle, 5);
    const anchor = a.angle === -90 || a.angle === 90 ? "middle" : a.angle > -90 && a.angle < 90 ? "start" : "end";
    b += line({ x1: cx, y1: cy, x2: sx, y2: sy, stroke: C.borderSoft });
    b += spec(lx, ly + 5, a.label, { anchor, size: 13 });
  });
  // ring value ticks 1,3,5 up the top spoke
  [1, 3, 5].forEach((ring) => {
    b += text(cx + 6, cy - (ring / 5) * radius + 5, String(ring), { size: 12, fill: C.borderMid });
  });
  // polygon B first (dashed, behind), then A
  b += el("polygon", { points: rpoly(B, cx, cy, radius), stroke: C.inkMuted, "stroke-width": 2,
    "stroke-dasharray": "6 4", "stroke-linejoin": "round", fill: C.inkMuted, "fill-opacity": 0.06 });
  b += el("polygon", { points: rpoly(A, cx, cy, radius), stroke: C.ink, "stroke-width": 2,
    "stroke-linejoin": "round", fill: C.ink, "fill-opacity": 0.08 });
  // vertices: A circles (ink), B squares (hollow)
  RADAR_AXES.forEach((a) => {
    const [bx, by] = rvtx(cx, cy, radius, a.angle, B.axes[a.i]);
    b += rect({ x: bx - 4, y: by - 4, width: 8, height: 8, fill: C.card, stroke: C.inkMuted, "stroke-width": 1.5 });
  });
  RADAR_AXES.forEach((a) => {
    const [ax, ay] = rvtx(cx, cy, radius, a.angle, A.axes[a.i]);
    b += circle({ cx: ax, cy: ay, r: 4.5, fill: C.ink });
  });

  const fy = H - 66;
  b += line({ x1: pad, y1: fy - 22, x2: W - pad, y2: fy - 22, stroke: C.borderSoft });
  b += spec(pad, fy, "Ideophone Arena · The Observatory", { size: 13, fill: C.ink });
  b += text(W - pad, fy - 2, ATTR_IIDA, { size: 16, fill: C.inkMuted, anchor: "end" });
  b += text(W - pad, fy + 22, "Perceptual strength 0–5 per axis; kana are the words’ canonical forms.", { size: 14, fill: C.borderMid, anchor: "end" });
  return svg(W, H, b);
}

// ===========================================================================
// FIGURE: strip art (~4:3) for the NIL-43 Observatory strip (art-left slot)
// A landscape recomposition of the signature scatter on a raised washi card.
// ===========================================================================
function figureStrip(W = 1600, H = 1200) {
  const pad = 56;
  let b = "";
  // raised card fills the frame (strip slot renders it on a raised-fill card)
  b += cardRect(pad, pad, W - pad * 2, H - pad * 2, C.raised, 20);
  const ix = pad + 56;
  b += spec(ix, pad + 78, "The Observatory · two measures");
  b += text(ix, pad + 138, "Two measures, two stories", { font: FONT, weight: 700, size: 52 });
  b += waveRule(ix, pad + 158, 1.0);
  b += text(ix, pad + 214, "Ratings tell ideophones from prosaic words; guessing doesn’t.", { size: 24, fill: C.inkMuted });

  const cx = ix, cy = pad + 250;
  const legendY = cy + 6;
  const plotX = cx + 90, plotY = cy + 92;
  const plotW = W - pad * 2 - 112 - 190, plotH = H - pad * 2 - 250 - 218;
  b += scatterLegend(plotX, legendY, 15);
  b += scatterCore(plotX, plotY, plotW, plotH, { marginals: 42 });
  b += spec(plotX + plotW / 2, plotY + plotH + 52, "Accuracy · % correct", { anchor: "middle", size: 12 });
  b += spec(cx + 24, plotY + plotH / 2, "Rating · z within study", { anchor: "middle", size: 12, transform: `rotate(-90 ${cx + 24} ${plotY + plotH / 2})` });

  const fy = H - pad - 40;
  b += text(ix, fy, DIVERGENCE, { size: 15, fill: C.inkMuted });
  b += text(ix, fy + 24, ATTR_MCLEAN + "  ·  " + ATTR_THESIS, { size: 12.5, fill: C.borderMid });
  return svg(W, H, b, C.page);
}

// ===========================================================================
// FIGURE: og-image / social card (1200x630)
// ===========================================================================
function figureOg(W = 1200, H = 630) {
  let b = "";
  const pad = 64;
  // left text column
  b += spec(pad, 108, "A research arena for sound-symbolism");
  b += text(pad, 190, "Ideophone", { font: FONT, weight: 700, size: 78, fill: C.ink });
  b += text(pad, 274, "Arena", { font: FONT, weight: 700, size: 78, fill: C.vermillion });
  b += waveRule(pad + 2, 300, 1.35);
  b += text(pad, 392, "The Observatory: every guess and", { size: 27, fill: C.inkMuted });
  b += text(pad, 428, "rating, aggregated live against the thesis.", { size: 27, fill: C.inkMuted });
  b += spec(pad, 520, "Japanese ideophones · script iconicity · 2AFC", { size: 13 });

  // right: kana specimen plate - verified canonical form (KANA, from the seed).
  // The stimulus voice is the brand's kana face (LINE Seed JP); ink, never
  // vermillion (kana is not arena data).
  const rw = 430, rh = H - pad * 2, rx = W - pad - rw, ry = pad, mid = rx + rw / 2;
  b += cardRect(rx, ry, rw, rh, C.card, 18);
  b += spec(rx + 34, ry + 50, "Specimen · visual ideophone", { size: 12 });
  b += text(mid, ry + 236, KANA.kirakira.canonical, { font: BODY, weight: 700, size: 90, anchor: "middle" });
  b += waveRule(mid - 108, ry + 272, 1.35);
  b += text(mid, ry + 356, "kirakira", { font: FONT, weight: 700, size: 34, anchor: "middle" });
  b += text(mid, ry + 398, "“glittering, sparkling”", { size: 21, anchor: "middle", fill: C.inkMuted });
  b += line({ x1: rx + 34, y1: ry + rh - 58, x2: rx + rw - 34, y2: ry + rh - 58, stroke: C.borderSoft });
  b += spec(rx + 34, ry + rh - 28, "Arena word", { size: 11 });
  b += spec(rx + rw - 34, ry + rh - 28, "Iida & Akita norm", { size: 11, anchor: "end" });
  return svg(W, H, b, C.page);
}

// ---- emit ------------------------------------------------------------------
const figures = {
  "observatory-dumbbell": figureDumbbell(),
  "observatory-scatter": figureScatter(),
  "observatory-radar": figureRadar(),
  "observatory-strip": figureStrip(),
  "og-image": figureOg(),
};
for (const [name, s] of Object.entries(figures)) {
  const p = join(OUT, `${name}.svg`);
  writeFileSync(p, s);
  console.log("wrote", p);
}
