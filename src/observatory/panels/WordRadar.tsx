// The fingerprint — per-word modality profiles (SPEC-stats-dashboard §3.4).
// Six perceptual-strength axes (0–5) from the vendored Iida & Akita norms;
// two-word compare overlay; searchable pickers over all 510 words with the
// arena's 17 romaji-equality matches badged. Reference data — no vermillion,
// and no modality-trio colors either (the axes themselves are modalities):
// the two words differ by line style + vertex shape + direct labels.
// Pure trigonometry; d3 stays out of this panel.

import { useRef, useState } from "react";
import { Input } from "../../components/ui/input";
import { norms } from "../../data/observatory";
import type { NormsWord } from "../../data/observatory";
import { CollapsedTable } from "../chart/CollapsedTable";
import { SpecimenLabel, SpecimenText } from "../chart/SpecimenLabel";
import { useChartSize } from "../chart/useChartSize";

// Display order re-slots the norms axes (aud, vis, hap, gus, olf, int) so the
// two longest labels sit top/bottom where centered text has the full width —
// what keeps 320 px legible without abbreviating (§4.3: direct labels are the
// CVD carrier). Angles in degrees, −90 = top, clockwise.
const DISPLAY_AXES: readonly { normIndex: number; label: string; angle: number }[] = [
  { normIndex: 0, label: "Auditory", angle: -90 },
  { normIndex: 1, label: "Visual", angle: -30 },
  { normIndex: 3, label: "Gustatory", angle: 30 },
  { normIndex: 5, label: "Interoceptive", angle: 90 },
  { normIndex: 4, label: "Olfactory", angle: 150 },
  { normIndex: 2, label: "Haptic", angle: 210 },
];

const AXIS_MAX = 5;
const RESULT_CAP = 12;

type RadarProps = {
  /** Norms words; defaults to the full vendored set (fixtures override in tests). */
  words?: NormsWord[];
  /** Initial compare pair; defaults to the pipeline's max-contrast pick. */
  defaultPair?: readonly [string, string];
  /** romaji → verbatim kana (displayForm) from the live record; an ARENA word
   * wears its kana once it has entered the record, romaji until then (§3.4). */
  kanaByRomaji?: ReadonlyMap<string, string>;
};

function vertex(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
  value: number,
): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const r = (value / AXIS_MAX) * radius;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function polygonPoints(
  word: NormsWord,
  cx: number,
  cy: number,
  radius: number,
): string {
  return DISPLAY_AXES.map(({ normIndex, angle }) =>
    vertex(cx, cy, radius, angle, word.axes[normIndex]).join(","),
  ).join(" ");
}

function WordChip({
  word,
  slot,
  kanaByRomaji,
}: {
  word: NormsWord | undefined;
  slot: "a" | "b";
  kanaByRomaji?: ReadonlyMap<string, string>;
}) {
  if (!word) return null;
  const kana = word.arena ? (kanaByRomaji?.get(word.arena.romaji) ?? null) : null;
  return (
    <span className={`radar-chip radar-chip--${slot}`}>
      <svg viewBox="0 0 20 12" width="20" height="12" aria-hidden="true">
        <line
          x1="1"
          y1="6"
          x2="19"
          y2="6"
          className={`radar-stroke--${slot}`}
        />
      </svg>
      <strong>{word.word}</strong>
      {word.arena ? (
        <>
          {kana ? (
            <span className="radar-chip-kana" lang="ja">
              {kana}
            </span>
          ) : null}
          <SpecimenLabel pill>Arena</SpecimenLabel>
          <span className="radar-chip-gloss">{word.arena.gloss}</span>
        </>
      ) : null}
    </span>
  );
}

function Picker({
  slot,
  words,
  selected,
  otherSelected,
  onSelect,
  kanaByRomaji,
}: {
  slot: "a" | "b";
  words: NormsWord[];
  selected: string;
  otherSelected: string;
  onSelect: (word: string) => void;
  kanaByRomaji?: ReadonlyMap<string, string>;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim().toLowerCase();
  const matches =
    trimmed === ""
      ? []
      : words
          .filter((w) => w.word.toLowerCase().includes(trimmed))
          .sort((a, b) => {
            const aStarts = a.word.toLowerCase().startsWith(trimmed) ? 0 : 1;
            const bStarts = b.word.toLowerCase().startsWith(trimmed) ? 0 : 1;
            return aStarts - bStarts;
          });
  const shown = matches.slice(0, RESULT_CAP);
  const inputId = `radar-picker-${slot}`;

  return (
    <div className="radar-picker">
      <label className="specimen-label" htmlFor={inputId}>
        {slot === "a" ? "Word A" : "Word B"}
      </label>
      <Input
        id={inputId}
        ref={inputRef}
        type="search"
        placeholder={`Search 510 words… (now: ${selected})`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {/* Always-mounted live region: screen readers hear the result count
          appear/change below the input (silent DOM insertion otherwise). */}
      <div role="status" className="sr-only">
        {trimmed === ""
          ? null
          : matches.length === 0
            ? "No word matches."
            : `${matches.length} words match; ${shown.length} listed below.`}
      </div>
      {trimmed !== "" ? (
        <ul className="radar-picker-results">
          {shown.map((w) => (
            <li key={w.word}>
              <button
                type="button"
                onClick={() => {
                  onSelect(w.word);
                  setQuery("");
                  // The list unmounts with the click target in it — return
                  // focus to the input instead of dropping it on <body>.
                  inputRef.current?.focus();
                }}
                disabled={w.word === otherSelected}
              >
                <strong>{w.word}</strong>
                {w.arena ? (
                  <>
                    {kanaByRomaji?.get(w.arena.romaji) ? (
                      <span className="radar-chip-kana" lang="ja">
                        {kanaByRomaji.get(w.arena.romaji)}
                      </span>
                    ) : null}
                    <SpecimenLabel pill>Arena</SpecimenLabel>
                    <span className="radar-chip-gloss">{w.arena.gloss}</span>
                  </>
                ) : null}
              </button>
            </li>
          ))}
          {matches.length > shown.length ? (
            <li className="radar-picker-more">
              … {matches.length - shown.length} more — keep typing.
            </li>
          ) : null}
          {matches.length === 0 ? (
            <li className="radar-picker-more">
              No word matches. The norms use romaji (kirakira, dokidoki…).
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export default function WordRadar({
  words = norms.words,
  defaultPair = norms.meta.defaultPair,
  kanaByRomaji,
}: RadarProps) {
  const { ref, width } = useChartSize(560);
  const [wordA, setWordA] = useState(defaultPair[0]);
  const [wordB, setWordB] = useState(defaultPair[1]);

  const byWord = new Map(words.map((w) => [w.word, w]));
  const a = byWord.get(wordA);
  const b = byWord.get(wordB);

  const size = Math.min(width, 460);
  const labelPad = size >= 360 ? 64 : 52;
  const radius = size / 2 - labelPad;
  const cx = width / 2;
  const cy = size / 2 + 8;

  return (
    <section className="observatory-panel observatory-panel--radar">
      <h2>The fingerprint — perceptual profiles</h2>
      <p className="observatory-panel-copy">
        Every word carries a six-sense profile: how strongly it evokes
        hearing, sight, touch, taste, smell, and inner states. Compare any two
        of the 510 normed words — the arena's own words wear their badge.
      </p>
      <div className="radar-pickers">
        <Picker
          slot="a"
          words={words}
          selected={wordA}
          otherSelected={wordB}
          onSelect={setWordA}
          kanaByRomaji={kanaByRomaji}
        />
        <Picker
          slot="b"
          words={words}
          selected={wordB}
          otherSelected={wordA}
          onSelect={setWordB}
          kanaByRomaji={kanaByRomaji}
        />
      </div>
      <div className="radar-chips">
        <WordChip word={a} slot="a" kanaByRomaji={kanaByRomaji} />
        <WordChip word={b} slot="b" kanaByRomaji={kanaByRomaji} />
      </div>
      <figure className="chart-figure" ref={ref}>
        <svg
          role="img"
          aria-label={`Radar chart comparing ${wordA} and ${wordB} across six perceptual axes; values in the data table.`}
          viewBox={`0 0 ${width} ${size + 16}`}
          width="100%"
          height={size + 16}
        >
          {/* rings at 1..5 */}
          {[1, 2, 3, 4, 5].map((ring) => (
            <polygon
              key={ring}
              className="radar-ring"
              points={DISPLAY_AXES.map(({ angle }) =>
                vertex(cx, cy, radius, angle, ring).join(","),
              ).join(" ")}
            />
          ))}
          {/* spokes + axis labels. Side labels clamp into the figure bounds
              (estimated glyph width — no DOM measuring, SSR-safe) so nothing
              clips at 320 px; the CVD rule needs every axis direct-labeled. */}
          {DISPLAY_AXES.map(({ label, angle }) => {
            const [sx, sy] = vertex(cx, cy, radius, angle, AXIS_MAX);
            const [rawLx, ly] = vertex(cx, cy, radius + 14, angle, AXIS_MAX);
            const anchor =
              angle === -90 || angle === 90
                ? "middle"
                : angle > -90 && angle < 90
                  ? "start"
                  : "end";
            // ~10.5 px per glyph at --text-xs weight 700 with wide tracking.
            const estimatedWidth = label.length * 10.5;
            const lx =
              anchor === "end"
                ? Math.max(rawLx, estimatedWidth + 2)
                : anchor === "start"
                  ? Math.min(rawLx, width - estimatedWidth - 2)
                  : rawLx;
            return (
              <g key={label}>
                <line className="radar-spoke" x1={cx} y1={cy} x2={sx} y2={sy} />
                <SpecimenText
                  x={lx}
                  y={ly}
                  dy="0.32em"
                  textAnchor={anchor}
                >
                  {label}
                </SpecimenText>
              </g>
            );
          })}
          {/* ring value ticks along the top spoke */}
          {[1, 3, 5].map((ring) => (
            <SpecimenText
              key={ring}
              className="radar-ring-value"
              x={cx + 4}
              y={cy - (ring / AXIS_MAX) * radius}
              dy="0.32em"
            >
              {String(ring)}
            </SpecimenText>
          ))}

          {a ? (
            <g className="radar-word radar-word--a">
              <polygon
                className="radar-polygon radar-polygon--a"
                points={polygonPoints(a, cx, cy, radius)}
              />
              {DISPLAY_AXES.map(({ normIndex, angle }) => {
                const [px, py] = vertex(cx, cy, radius, angle, a.axes[normIndex]);
                return (
                  <circle
                    key={angle}
                    className="radar-vertex--a"
                    cx={px}
                    cy={py}
                    r={3.5}
                  />
                );
              })}
            </g>
          ) : null}
          {b ? (
            <g className="radar-word radar-word--b">
              <polygon
                className="radar-polygon radar-polygon--b"
                points={polygonPoints(b, cx, cy, radius)}
              />
              {DISPLAY_AXES.map(({ normIndex, angle }) => {
                const [px, py] = vertex(cx, cy, radius, angle, b.axes[normIndex]);
                return (
                  <rect
                    key={angle}
                    className="radar-vertex--b"
                    x={px - 3}
                    y={py - 3}
                    width={6}
                    height={6}
                  />
                );
              })}
            </g>
          ) : null}
        </svg>
        <figcaption className="chart-notes">
          <span>
            Perceptual strength 0–5 per axis, Iida &amp; Akita (2023) norms —
            510 words; {norms.meta.arenaMatchCount} arena words carry the badge.
          </span>
        </figcaption>
      </figure>
      <CollapsedTable
        tableId="observatory-radar-table"
        caption={`Perceptual strength (0–5) per axis: ${wordA} versus ${wordB}.`}
        columns={["Axis", wordA, wordB]}
        rows={DISPLAY_AXES.map(({ normIndex, label }) => [
          label,
          a ? a.axes[normIndex].toFixed(1) : "—",
          b ? b.axes[normIndex].toFixed(1) : "—",
        ])}
      />
    </section>
  );
}
