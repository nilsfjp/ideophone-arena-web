// The claim — accuracy by modality (SPEC-stats-dashboard §3.2). One dumbbell
// row per thesis modality: thesis mean (ink) vs live arena weighted mean
// (vermillion), chance hairline at 50%. Low-n honesty: live dots render
// hollow under 30 guesses, with N printed in the row label. Direct labels and
// printed values carry the reading — color is never the sole carrier (§4.3).

import type { DivergenceEntry } from "../../api/types";
import { thesisPairs } from "../../data/observatory";
import type { TrioModality } from "../../data/observatory";
import {
  LOW_N_THRESHOLD,
  weightedModalityAccuracy,
  type ApiTrioModality,
} from "../chart/aggregate";
import { CollapsedTable } from "../chart/CollapsedTable";
import { formatCount, formatPercent, formatPercentPrecise } from "../chart/format";
import { Axis } from "../chart/axis";
import { dumbbellDomain, makeLinearScale, PERCENT_TICKS } from "../chart/scales";
import { SpecimenText } from "../chart/SpecimenLabel";
import { useChartSize } from "../chart/useChartSize";

type RowSpec = {
  api: ApiTrioModality;
  key: TrioModality;
  /** Landing vocabulary + research term (§10.5), uppercased by CSS. */
  label: string;
  /** Narrow-width label — keeps the row label clear of the N figure. */
  shortLabel: string;
};

const ROW_SPECS: readonly RowSpec[] = [
  { api: "AUDITORY", key: "auditory", label: "Sound · auditory", shortLabel: "Sound" },
  { api: "VISUAL", key: "visual", label: "Sight · visual", shortLabel: "Sight" },
  {
    api: "INTEROCEPTIVE",
    key: "interoceptive",
    label: "Inner states · interoceptive",
    shortLabel: "Inner states",
  },
];

/** Below this figure width the row labels drop their research term. */
const SHORT_LABEL_WIDTH = 520;

const M_LEFT = 16;
const M_RIGHT = 28;
const ROW_TOP = 48;
const ROW_STEP = 68;
const AXIS_Y = ROW_TOP + ROW_SPECS.length * ROW_STEP;
const HEIGHT = AXIS_Y + 34;

type DumbbellProps = {
  /** Live divergence rows; null = live record unavailable (thesis still renders). */
  liveRows: DivergenceEntry[] | null;
};

export default function ModalityDumbbell({ liveRows }: DumbbellProps) {
  const { ref, width } = useChartSize();
  const live = weightedModalityAccuracy(liveRows ?? []);

  const rows = ROW_SPECS.map((spec) => ({
    ...spec,
    thesis: thesisPairs.byModality[spec.key],
    live: live[spec.api],
  }));

  const values = rows.flatMap((r) =>
    r.live.accuracy === null
      ? [r.thesis.accuracy]
      : [r.thesis.accuracy, r.live.accuracy],
  );
  const x = makeLinearScale(dumbbellDomain(values), [M_LEFT, width - M_RIGHT]);
  const anyHollow = rows.some(
    (r) => r.live.accuracy !== null && r.live.guessCount < LOW_N_THRESHOLD,
  );

  return (
    <section className="observatory-panel observatory-panel--dumbbell">
      <h2>The claim — accuracy by modality</h2>
      <p className="observatory-panel-copy">
        Sound carries furthest. In the thesis, guessing slid 68.6% → 64.2% →
        59.7% as meanings turned inward. The arena record tests that ordering
        out of sample with every guess.
      </p>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5" className="legend-swatch--thesis" />
          </svg>
          <span className="specimen-label">Thesis · N = 36</span>
        </span>
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="6" className="legend-swatch--arena" />
          </svg>
          <span className="specimen-label">Arena · live</span>
        </span>
      </div>
      <figure className="chart-figure" ref={ref}>
        <svg
          role="img"
          aria-label="Dumbbell chart of guessing accuracy per modality: thesis study versus live arena record."
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
        >
          <line
            className="chart-chance"
            x1={x(0.5)}
            x2={x(0.5)}
            y1={24}
            y2={AXIS_Y}
          />
          <SpecimenText x={x(0.5)} y={14} textAnchor="middle">
            Chance · 50%
          </SpecimenText>

          {rows.map((row, i) => {
            const labelY = ROW_TOP + i * ROW_STEP;
            const trackY = labelY + 28;
            const liveAccuracy = row.live.accuracy;
            const hollow =
              liveAccuracy !== null && row.live.guessCount < LOW_N_THRESHOLD;
            return (
              <g key={row.key} className="dumbbell-row">
                <SpecimenText x={M_LEFT} y={labelY}>
                  {width < SHORT_LABEL_WIDTH ? row.shortLabel : row.label}
                </SpecimenText>
                <SpecimenText x={width - M_RIGHT} y={labelY} textAnchor="end">
                  {/* Unreachable record ≠ zero guesses — null is not 0. */}
                  {liveRows === null
                    ? "N = —"
                    : `N = ${formatCount(row.live.guessCount)}`}
                </SpecimenText>
                {liveAccuracy !== null ? (
                  <line
                    className="dumbbell-connector"
                    x1={x(row.thesis.accuracy)}
                    x2={x(liveAccuracy)}
                    y1={trackY}
                    y2={trackY}
                  />
                ) : null}
                <circle
                  className="dumbbell-thesis"
                  cx={x(row.thesis.accuracy)}
                  cy={trackY}
                  r={5}
                />
                <SpecimenText
                  className="dumbbell-value dumbbell-value--thesis"
                  x={x(row.thesis.accuracy)}
                  y={trackY - 12}
                  textAnchor="middle"
                >
                  {formatPercentPrecise(row.thesis.accuracy)}
                </SpecimenText>
                {liveAccuracy !== null ? (
                  <>
                    <circle
                      className={
                        hollow
                          ? "dumbbell-live dumbbell-live--hollow"
                          : "dumbbell-live"
                      }
                      cx={x(liveAccuracy)}
                      cy={trackY}
                      r={7}
                    />
                    <SpecimenText
                      className="dumbbell-value dumbbell-value--live"
                      x={x(liveAccuracy)}
                      y={trackY + 22}
                      textAnchor="middle"
                    >
                      {formatPercentPrecise(liveAccuracy)}
                    </SpecimenText>
                  </>
                ) : null}
              </g>
            );
          })}

          <Axis
            orientation="bottom"
            scale={x}
            ticks={PERCENT_TICKS.filter((t) => x(t) >= M_LEFT)}
            tickFormat={formatPercent}
            transform={`translate(0, ${AXIS_Y})`}
          />
        </svg>
        <figcaption className="chart-notes">
          <span>
            Thesis dots cover the 30 study pairs; arena dots cover every pool
            word played in that modality, practice rounds included.
          </span>
          {anyHollow ? (
            <span>
              Hollow dots mark modalities still under {LOW_N_THRESHOLD} live
              guesses.
            </span>
          ) : null}
          {liveRows === null ? (
            <span>The live record is unreachable right now.</span>
          ) : null}
        </figcaption>
      </figure>
      <CollapsedTable
        tableId="observatory-dumbbell-table"
        caption="Guessing accuracy per modality: thesis study versus live arena record."
        columns={["Modality", "Thesis accuracy", "Thesis n", "Arena accuracy", "Arena guesses"]}
        rows={rows.map((row) => [
          row.label,
          formatPercentPrecise(row.thesis.accuracy),
          formatCount(row.thesis.n),
          row.live.accuracy === null
            ? "—"
            : formatPercentPrecise(row.live.accuracy),
          formatCount(row.live.guessCount),
        ])}
      />
    </section>
  );
}
