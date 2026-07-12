// The two measures - divergence scatter (SPEC-stats-dashboard §3.3).
// x = guess accuracy (native % - every layer is 2AFC), y = rating z-scored
// WITHIN each study (adjudicated 2026-07-05): McLean's published z, the
// thesis pairs' committed z, and the arena layer standardized client-side
// (suppressed under 3 rated words - no fake positions from noise sd).
// Stratum is the backdrop's story and rides shape + fill, never vermillion;
// vermillion is reserved for the arena's own data and the session crosshair.

import { useState, type KeyboardEvent } from "react";
import { area, curveLinear } from "d3-shape";
import type { DivergenceEntry } from "../../api/types";
import { mclean, thesisPairs, arenaPool } from "../../data/observatory";
import {
  buildArenaScatter,
  zScore,
  type ArenaScatterPoint,
} from "../chart/aggregate";
import { Axis } from "../chart/axis";
import { CollapsedTable } from "../chart/CollapsedTable";
import {
  formatCI,
  formatCount,
  formatPercent,
  formatPercentPrecise,
  formatRating7,
} from "../chart/format";
import { kdeCurve, type KdePoint } from "../chart/kde";
import { makeLinearScale, PERCENT_TICKS } from "../chart/scales";
import { SpecimenText } from "../chart/SpecimenLabel";
import { useChartSize } from "../chart/useChartSize";
import type { SessionMarker } from "../Observatory";

const M_LEFT = 56;
const M_RIGHT = 8;
const GAP = 8;
const KDE_W = 44;
const KDE_H = 44;
const AXIS_H = 44;

type Tooltip = {
  /** Which mark pinned it - blur dismissal only clears its own tooltip. */
  owner: string;
  /** Chart width the position was computed at - stale after a reflow. */
  atWidth: number;
  px: number;
  py: number;
  title: string;
  /** Verbatim kana (displayForm), rendered lang="ja"; null when unavailable. */
  kana: string | null;
  subtitle: string | null;
  lines: string[];
};

type ScatterProps = {
  /** Live divergence rows; null = live record unavailable. */
  liveRows: DivergenceEntry[] | null;
  /** Set when arriving via the completion panel's "See where this session lands". */
  session: SessionMarker | null;
  /** romaji → verbatim kana (displayForm) from the live record; kana appears
   * on a word once it has entered the record, romaji until then (§3.4). */
  kanaByRomaji?: ReadonlyMap<string, string>;
};

const POOL_ROMAJI = arenaPool.words.map((w) => w.romaji);

export default function DivergenceScatter({
  liveRows,
  session,
  kanaByRomaji,
}: ScatterProps) {
  const { ref, width } = useChartSize();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  // A pinned tooltip's pixel position is only valid for the width it was
  // computed at - clear it on reflow (render-phase state adjustment, the
  // sanctioned "derived state" pattern) so it can't resurrect if the chart
  // later returns to the pinned width.
  if (tooltip !== null && tooltip.atWidth !== width) {
    setTooltip(null);
  }
  const activeTooltip = tooltip && tooltip.atWidth === width ? tooltip : null;

  const arena = buildArenaScatter(liveRows ?? [], POOL_ROMAJI);
  const mcleanIdeophones = mclean.items.filter((i) => i.stratum === "ideophone");
  const mcleanProsaic = mclean.items.filter((i) => i.stratum === "prosaic");

  const plotW = Math.max(width - M_LEFT - M_RIGHT - GAP - KDE_W, 220);
  const plotH = Math.min(Math.max(0.72 * plotW, 240), 420);
  const height = KDE_H + GAP + plotH + AXIS_H;

  const allZ = [
    ...mclean.items.map((i) => i.ratingZ),
    ...thesisPairs.pairs.map((p) => p.meanRatingZ),
    ...arena.points.map((p) => p.z),
  ];
  const zMin = Math.min(-2.2, ...allZ) - 0.3;
  const zMax = Math.max(2.2, ...allZ) + 0.3;
  const x = makeLinearScale([0, 1], [0, plotW]);
  const y = makeLinearScale([zMin, zMax], [plotH, 0]);
  const zTicks = [-2, -1, 0, 1, 2].filter((t) => t > zMin && t < zMax);

  const kdeX = (values: number[]) => kdeCurve(values, { min: 0, max: 1 });
  const kdeY = (values: number[]) => kdeCurve(values, { min: zMin, max: zMax });
  const xArea = area<KdePoint>()
    .curve(curveLinear)
    .x((d) => x(d.x))
    .y0(KDE_H - 2)
    .y1((d) => KDE_H - 2 - d.y * (KDE_H - 8));
  const yArea = area<KdePoint>()
    .curve(curveLinear)
    .y((d) => y(d.x))
    .x0(2)
    .x1((d) => 2 + d.y * (KDE_W - 8));

  const marginals: { key: string; className: string; xs: number[]; zs: number[] }[] = [
    {
      key: "mclean-ideophone",
      className: "kde-path kde-path--mclean-ideophone",
      xs: mcleanIdeophones.map((i) => i.guessScore),
      zs: mcleanIdeophones.map((i) => i.ratingZ),
    },
    {
      key: "mclean-prosaic",
      className: "kde-path kde-path--mclean-prosaic",
      xs: mcleanProsaic.map((i) => i.guessScore),
      zs: mcleanProsaic.map((i) => i.ratingZ),
    },
    {
      key: "thesis",
      className: "kde-path kde-path--thesis",
      xs: thesisPairs.pairs.map((p) => p.accuracy),
      zs: thesisPairs.pairs.map((p) => p.meanRatingZ),
    },
    {
      key: "arena",
      className: "kde-path kde-path--arena",
      xs: arena.points.map((p) => p.x),
      zs: arena.points.map((p) => p.z),
    },
  ];

  const clearTooltip = () => setTooltip(null);
  // Blur must not wipe a tooltip another mark just pinned (pointerdown on
  // mark B fires before mark A's blur) - it only clears its own.
  const clearTooltipFor = (owner: string) =>
    setTooltip((current) => (current?.owner === owner ? null : current));
  const onFigureKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") clearTooltip();
  };
  const showTooltip = (
    owner: string,
    plotX: number,
    plotY: number,
    title: string,
    subtitle: string | null,
    lines: string[],
    kana: string | null = null,
  ) => {
    setTooltip({
      owner,
      atWidth: width,
      px: Math.min(Math.max(M_LEFT + plotX, 110), width - 110),
      py: KDE_H + GAP + plotY,
      title,
      kana,
      subtitle,
      lines,
    });
  };
  // Kana for a pool word (arena/thesis layers) once the live record carries it.
  const kanaFor = (romaji: string | null | undefined): string | null =>
    (romaji ? kanaByRomaji?.get(romaji) : null) ?? null;
  // Table "Word" cell: verbatim kana (lang="ja") beside romaji, romaji alone
  // until the record supplies a kana form.
  const kanaWordCell = (romaji: string, kana: string | null) =>
    kana ? (
      <>
        <span lang="ja">{kana}</span> {romaji}
      </>
    ) : (
      romaji
    );

  const arenaAria = (p: ArenaScatterPoint) =>
    `${p.label}${p.gloss ? `, ${p.gloss}` : ""} (arena). Guesses ${formatCount(p.guessCount)}: ` +
    `${formatPercentPrecise(p.x)} correct${p.wilson ? `, CI ${formatCI(p.wilson)}` : ""}. ` +
    `Mean rating ${formatRating7(p.meanRating)}, N = ${formatCount(p.ratingCount)}.`;

  // Session crosshair: x is always drawable; y needs the player's rating mean
  // AND the arena layer's standardization context (§3.3 benchmark grammar).
  const sessionZ =
    session && session.meanRating !== null && arena.ratingZContext
      ? Math.min(Math.max(zScore(session.meanRating, arena.ratingZContext), zMin), zMax)
      : null;

  return (
    <section className="observatory-panel observatory-panel--scatter">
      <h2>The two measures · guessing and rating</h2>
      <p className="observatory-panel-copy">
        Ratings separate ideophones from prosaic words; guessing doesn't. Each
        mark is one word; the backdrop is McLean 2023's 304 items, the ink
        dots are the 30 thesis pairs, and the vermillion dots are this arena's
        own record, growing with play.
      </p>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="4" className="legend-swatch--mclean-ideophone" />
          </svg>
          <span className="specimen-label">● Ideophone · McLean 2023</span>
        </span>
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" className="legend-swatch--mclean-prosaic" />
          </svg>
          <span className="specimen-label">■ Prosaic · McLean 2023</span>
        </span>
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" className="legend-swatch--thesis" />
          </svg>
          <span className="specimen-label">Thesis pairs</span>
        </span>
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5" className="legend-swatch--arena" />
          </svg>
          <span className="specimen-label">Arena · live</span>
        </span>
      </div>
      <figure className="chart-figure" ref={ref} onKeyDown={onFigureKeyDown}>
        <svg
          role="img"
          aria-label="Scatter plot of guess accuracy against within-study rating z-scores, with marginal densities."
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          onMouseLeave={clearTooltip}
        >
          {/* x marginal densities */}
          <g transform={`translate(${M_LEFT}, 0)`} aria-hidden="true">
            {marginals.map((m) =>
              m.xs.length > 0 ? (
                <path key={m.key} className={m.className} d={xArea(kdeX(m.xs)) ?? ""} />
              ) : null,
            )}
          </g>
          {/* y marginal densities */}
          <g
            transform={`translate(${M_LEFT + plotW + GAP}, ${KDE_H + GAP})`}
            aria-hidden="true"
          >
            {marginals.map((m) =>
              m.zs.length > 0 ? (
                <path key={m.key} className={m.className} d={yArea(kdeY(m.zs)) ?? ""} />
              ) : null,
            )}
          </g>

          <g transform={`translate(${M_LEFT}, ${KDE_H + GAP})`}>
            <Axis
              orientation="bottom"
              scale={x}
              ticks={PERCENT_TICKS}
              tickFormat={formatPercent}
              gridLength={plotH}
              transform={`translate(0, ${plotH})`}
            />
            <Axis
              orientation="left"
              scale={y}
              ticks={zTicks}
              tickFormat={(t) => (t > 0 ? `+${t}` : String(t))}
              gridLength={plotW}
            />
            <line
              className="chart-chance"
              x1={x(0.5)}
              x2={x(0.5)}
              y1={0}
              y2={plotH}
            />

            {/* click-to-clear backdrop (touch: tap background dismisses) */}
            <rect
              className="scatter-backdrop"
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerDown={clearTooltip}
            />

            <g
              role="img"
              aria-label={`McLean 2023 backdrop: ${mclean.items.length} words; full values in the data table.`}
            >
              {mcleanIdeophones.map((item) => {
                const show = () =>
                  showTooltip(`mclean-${item.id}`, x(item.guessScore), y(item.ratingZ), item.word, item.concept, [
                    `Guessed ${formatPercentPrecise(item.guessScore)}`,
                    `Rating ${item.ratingScore.toFixed(2)} · normalized`,
                  ]);
                return (
                  <circle
                    key={item.id}
                    className="scatter-mark--mclean-ideophone"
                    cx={x(item.guessScore)}
                    cy={y(item.ratingZ)}
                    r={3}
                    onMouseEnter={show}
                    onPointerDown={show}
                  />
                );
              })}
              {mcleanProsaic.map((item) => {
                const show = () =>
                  showTooltip(`mclean-${item.id}`, x(item.guessScore), y(item.ratingZ), item.word, item.concept, [
                    `Guessed ${formatPercentPrecise(item.guessScore)}`,
                    `Rating ${item.ratingScore.toFixed(2)} · normalized`,
                  ]);
                return (
                  <rect
                    key={item.id}
                    className="scatter-mark--mclean-prosaic"
                    x={x(item.guessScore) - 2.75}
                    y={y(item.ratingZ) - 2.75}
                    width={5.5}
                    height={5.5}
                    onMouseEnter={show}
                    onPointerDown={show}
                  />
                );
              })}
            </g>

            {thesisPairs.pairs.map((pair) => {
              const owner = `thesis-${pair.pairing}`;
              const show = () =>
                showTooltip(
                  owner,
                  x(pair.accuracy),
                  y(pair.meanRatingZ),
                  pair.romaji,
                  `Thesis pair · ${pair.modality}`,
                  [
                    `Accuracy ${formatPercentPrecise(pair.accuracy)} (${pair.nCorrect}/${pair.n})`,
                    `Rating ${formatRating7(pair.meanRating)}`,
                  ],
                  kanaFor(pair.romaji),
                );
              return (
                <circle
                  key={pair.pairing}
                  className="scatter-mark--thesis"
                  cx={x(pair.accuracy)}
                  cy={y(pair.meanRatingZ)}
                  r={4.5}
                  tabIndex={0}
                  role="img"
                  aria-label={`${pair.romaji} (thesis, ${pair.modality}). Accuracy ${formatPercentPrecise(pair.accuracy)}. Mean rating ${formatRating7(pair.meanRating)}.`}
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => clearTooltipFor(owner)}
                  onPointerDown={show}
                />
              );
            })}

            {arena.points.map((point) => {
              const owner = `arena-${point.ideophoneId}`;
              const show = () =>
                showTooltip(
                  owner,
                  x(point.x),
                  y(point.z),
                  point.label,
                  point.gloss,
                  [
                    `Guesses ${formatCount(point.guessCount)} · ${formatPercentPrecise(point.x)}${point.wilson ? ` · CI ${formatCI(point.wilson)}` : ""}`,
                    `Rating ${formatRating7(point.meanRating)} · N = ${formatCount(point.ratingCount)}`,
                  ],
                  point.displayForm ?? kanaFor(point.label),
                );
              return (
                <circle
                  key={point.ideophoneId}
                  className="scatter-mark--arena"
                  cx={x(point.x)}
                  cy={y(point.z)}
                  r={5.5}
                  tabIndex={0}
                  role="img"
                  aria-label={arenaAria(point)}
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => clearTooltipFor(owner)}
                  onPointerDown={show}
                />
              );
            })}

            {session ? (
              <g className="scatter-session" aria-hidden="true">
                <line
                  className="scatter-session-line"
                  x1={x(session.accuracy)}
                  x2={x(session.accuracy)}
                  y1={0}
                  y2={plotH}
                />
                <SpecimenText
                  className="scatter-session-label"
                  x={Math.min(Math.max(x(session.accuracy), 70), plotW - 70)}
                  y={12}
                  textAnchor="middle"
                >
                  {`This session · ${formatPercent(session.accuracy)}`}
                </SpecimenText>
                {sessionZ !== null && session.meanRating !== null ? (
                  <>
                    <line
                      className="scatter-session-line"
                      x1={0}
                      x2={plotW}
                      y1={y(sessionZ)}
                      y2={y(sessionZ)}
                    />
                    <SpecimenText
                      className="scatter-session-label"
                      x={plotW - 6}
                      y={y(sessionZ) - 6}
                      textAnchor="end"
                    >
                      {`Your ratings · ${formatRating7(session.meanRating)}`}
                    </SpecimenText>
                  </>
                ) : null}
              </g>
            ) : null}
          </g>

          <SpecimenText
            x={M_LEFT + plotW / 2}
            y={height - 6}
            textAnchor="middle"
          >
            Accuracy · % correct
          </SpecimenText>
          <SpecimenText
            transform={`translate(12, ${KDE_H + GAP + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            Rating · z within study
          </SpecimenText>
        </svg>

        {activeTooltip ? (
          <div
            className="chart-tooltip"
            role="presentation"
            style={{
              left: activeTooltip.px,
              top: activeTooltip.py,
              transform:
                activeTooltip.py > 110
                  ? "translate(-50%, calc(-100% - 12px))"
                  : "translate(-50%, 14px)",
            }}
          >
            {activeTooltip.kana ? (
              <strong className="chart-tooltip-kana" lang="ja">
                {activeTooltip.kana}
              </strong>
            ) : null}
            <strong>{activeTooltip.title}</strong>
            {activeTooltip.subtitle ? <span>{activeTooltip.subtitle}</span> : null}
            {activeTooltip.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ) : null}

        <figcaption className="chart-notes">
          {/* Text twin for the crosshair - the SVG overlay is decorative
              (aria-hidden), so the session values must live in real text. */}
          {session ? (
            <span className="scatter-session-note">
              {`This session lands at ${formatPercent(session.accuracy)} accuracy`}
              {session.meanRating !== null
                ? ` with a mean rating of ${formatRating7(session.meanRating)}`
                : ""}
              .
            </span>
          ) : null}
          <span>
            Each layer is standardized within its own study; tooltips carry the
            native scales. Compare positions within a layer, not across layers.
          </span>
          <span>
            The two measures see different things: ρ ≈ +.44 overall, +.65
            within ideophones (McLean, Dunn &amp; Dingemanse 2023).
          </span>
          {arena.suppressed ? (
            <span>
              The arena layer joins the plot once three words carry both
              measures with some spread; {formatCount(arena.eligibleCount)} do
              so far.
            </span>
          ) : null}
          {arena.awaitingRating > 0 ? (
            <span>
              {arena.awaitingRating === 1
                ? "One word awaits its first rating."
                : `${formatCount(arena.awaitingRating)} words await their first rating.`}
            </span>
          ) : null}
          {arena.awaitingGuess > 0 ? (
            <span>
              {arena.awaitingGuess === 1
                ? "One word awaits its first guess."
                : `${formatCount(arena.awaitingGuess)} words await their first guess.`}
            </span>
          ) : null}
          {liveRows !== null && arena.neverPlayed > 0 ? (
            <span>
              {arena.neverPlayed === 1
                ? "One pool word has yet to enter the record."
                : `${formatCount(arena.neverPlayed)} pool words have yet to enter the record.`}
            </span>
          ) : null}
          {liveRows === null ? (
            <span>The live arena layer is unreachable right now.</span>
          ) : null}
        </figcaption>
      </figure>
      <CollapsedTable
        tableId="observatory-scatter-table"
        caption="All plotted words: guess accuracy and rating, native scales per study."
        columns={["Layer", "Word", "Meaning / concept", "Stratum", "Guess accuracy", "Guesses", "Rating", "Ratings"]}
        rows={[
          ...mclean.items.map((item) => [
            "McLean 2023",
            item.word,
            item.concept,
            item.stratum,
            formatPercentPrecise(item.guessScore),
            "–",
            `${item.ratingScore.toFixed(2)} · normalized`,
            "–",
          ]),
          ...thesisPairs.pairs.map((pair) => [
            "Thesis",
            kanaWordCell(pair.romaji, kanaFor(pair.romaji)),
            "–",
            "ideophone",
            formatPercentPrecise(pair.accuracy),
            formatCount(pair.n),
            formatRating7(pair.meanRating),
            "36",
          ]),
          ...arena.points.map((point) => [
            "Arena",
            kanaWordCell(point.label, point.displayForm ?? kanaFor(point.label)),
            point.gloss ?? "–",
            "ideophone",
            formatPercentPrecise(point.x),
            formatCount(point.guessCount),
            formatRating7(point.meanRating),
            formatCount(point.ratingCount),
          ]),
        ]}
      />
    </section>
  );
}
