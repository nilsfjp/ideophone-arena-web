// The integrity strip - position bias (SPEC-stats-dashboard §3.5, v1.1). An
// SDT-flavored fairness check on the forced choice: before any accuracy figure
// means anything, the choice itself has to be fair. Three deviation tracks
// against a 50% hairline - which card gets picked, and whether the target
// meaning is as guessable on top as on the bottom - plus the d′/criterion
// readout. Copy register: "A fair coin, checked." (§10.4: lab-calm, no cheer,
// never "orthogonal"). Every figure is direct-labeled - colour is never the
// sole carrier - and nulls render as "–", never 0 or NaN.

import type { PositionBiasResponse } from "../../api/types";
import { Axis } from "../chart/axis";
import { CollapsedTable } from "../chart/CollapsedTable";
import {
  formatCount,
  formatFixed2,
  formatPercentPrecise,
} from "../chart/format";
import { makeLinearScale, PERCENT_TICKS } from "../chart/scales";
import { SpecimenText } from "../chart/SpecimenLabel";
import { useChartSize } from "../chart/useChartSize";
import { wilsonInterval, type Interval } from "../chart/wilson";
import type { PositionBiasState } from "../Observatory";

const M_LEFT = 16;
const M_RIGHT = 16;
const ROW_TOP = 44;
const ROW_STEP = 56;
const HAIRLINE_TOP = 30;

type TrackSpec = {
  key: string;
  title: string;
  shortTitle: string;
  /** 0–1 rate, or null when the denominator was empty (null ≠ 0). */
  rate: number | null;
  /** Successes / n behind the rate, for the CI and the direct label. */
  successes: number;
  n: number;
};

const SHORT_TITLE_WIDTH = 560;

function buildTracks(bias: PositionBiasResponse): TrackSpec[] {
  return [
    {
      key: "pick",
      title: "Left card picked",
      shortTitle: "Left picked",
      rate: bias.leftPickRate,
      successes: bias.leftPickCount,
      n: bias.n,
    },
    {
      key: "top",
      title: "Target on top · correct",
      shortTitle: "Target top",
      rate: bias.targetTopAccuracy,
      successes: bias.targetTopCorrect,
      n: bias.targetTopN,
    },
    {
      key: "bottom",
      title: "Target on bottom · correct",
      shortTitle: "Target bottom",
      rate: bias.targetBottomAccuracy,
      successes: bias.targetBottomCorrect,
      n: bias.targetBottomN,
    },
  ];
}

type IntegrityProps = {
  positionBias: PositionBiasState;
};

export default function IntegrityStrip({ positionBias }: IntegrityProps) {
  const { ref, width } = useChartSize();
  const bias = positionBias.status === "ready" ? positionBias.data : null;
  const unreachable = positionBias.status === "error";
  const tracks = bias ? buildTracks(bias) : [];
  const empty = bias !== null && bias.n === 0;

  const axisY = ROW_TOP + 3 * ROW_STEP;
  const height = axisY + 30;
  const x = makeLinearScale([0, 1], [M_LEFT, width - M_RIGHT]);
  const cis: Record<string, Interval | null> = {};
  for (const t of tracks) cis[t.key] = wilsonInterval(t.successes, t.n);

  return (
    <section className="observatory-panel observatory-panel--integrity">
      <h2>A fair coin, checked</h2>
      <p className="observatory-panel-copy">
        Before a 64% means anything, the forced choice has to be fair. Two
        things could tilt it: which card sits on the left, and whether the
        target meaning is easier to spot on top than on the bottom. A fair task
        keeps the first at the hairline and the last two level with each other.
      </p>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5" className="legend-swatch--arena" />
          </svg>
          <span className="specimen-label">Arena · live, with 95% interval</span>
        </span>
      </div>
      <figure className="chart-figure" ref={ref}>
        <svg
          role="img"
          aria-label="Three fairness tracks against a 50% hairline: left-card pick rate, and accuracy when the target meaning sits on top versus on the bottom; full values in the data table."
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
        >
          <line
            className="chart-chance"
            x1={x(0.5)}
            x2={x(0.5)}
            y1={HAIRLINE_TOP}
            y2={axisY}
          />
          <SpecimenText x={x(0.5)} y={HAIRLINE_TOP - 6} textAnchor="middle">
            Fair · 50%
          </SpecimenText>

          {tracks.map((track, i) => {
            const labelY = ROW_TOP + i * ROW_STEP;
            const trackY = labelY + 22;
            const ci = cis[track.key];
            return (
              <g key={track.key} className="integrity-track">
                <SpecimenText x={M_LEFT} y={labelY}>
                  {width < SHORT_TITLE_WIDTH ? track.shortTitle : track.title}
                </SpecimenText>
                <SpecimenText x={width - M_RIGHT} y={labelY} textAnchor="end">
                  {track.rate === null
                    ? "–"
                    : `${formatPercentPrecise(track.rate)} · ${formatCount(
                        track.successes,
                      )}/${formatCount(track.n)}`}
                </SpecimenText>
                <line
                  className="integrity-baseline"
                  x1={M_LEFT}
                  x2={width - M_RIGHT}
                  y1={trackY}
                  y2={trackY}
                />
                {ci ? (
                  <line
                    className="integrity-ci"
                    x1={x(ci.lo)}
                    x2={x(ci.hi)}
                    y1={trackY}
                    y2={trackY}
                  />
                ) : null}
                {track.rate !== null ? (
                  <circle
                    className="integrity-marker"
                    cx={x(track.rate)}
                    cy={trackY}
                    r={6}
                  />
                ) : null}
              </g>
            );
          })}

          <Axis
            orientation="bottom"
            scale={x}
            ticks={PERCENT_TICKS}
            tickFormat={(t) => `${Math.round(t * 100)}%`}
            transform={`translate(0, ${axisY})`}
          />
        </svg>
        <dl className="integrity-readout">
          <div className="integrity-stat">
            <dt className="specimen-label">d′ · sensitivity</dt>
            <dd>{bias && bias.dPrime !== null ? formatFixed2(bias.dPrime) : "–"}</dd>
          </div>
          <div className="integrity-stat">
            <dt className="specimen-label">Criterion · 0 = unbiased</dt>
            <dd>
              {bias && bias.criterion !== null
                ? formatFixed2(bias.criterion)
                : "–"}
            </dd>
          </div>
        </dl>
        <figcaption className="chart-notes">
          <span>
            d′ reads the left/right choice as signal detection: sensitivity to
            where the target sat; criterion is the side bias, 0 being none.
          </span>
          {empty ? <span>Awaiting the first scored round.</span> : null}
          {unreachable ? (
            <span>The fairness check is unreachable right now.</span>
          ) : null}
        </figcaption>
      </figure>
      <CollapsedTable
        tableId="observatory-integrity-table"
        caption="Position-bias fairness check: pick rate, target-position accuracy, and signal-detection summary."
        columns={["Measure", "Rate", "Count", "n"]}
        rows={[
          [
            "Left card picked",
            bias && bias.leftPickRate !== null
              ? formatPercentPrecise(bias.leftPickRate)
              : "–",
            bias ? formatCount(bias.leftPickCount) : "–",
            bias ? formatCount(bias.n) : "–",
          ],
          [
            "Right card picked",
            bias && bias.leftPickRate !== null
              ? formatPercentPrecise(1 - bias.leftPickRate)
              : "–",
            bias ? formatCount(bias.rightPickCount) : "–",
            bias ? formatCount(bias.n) : "–",
          ],
          [
            "Target on top · correct",
            bias && bias.targetTopAccuracy !== null
              ? formatPercentPrecise(bias.targetTopAccuracy)
              : "–",
            bias ? formatCount(bias.targetTopCorrect) : "–",
            bias ? formatCount(bias.targetTopN) : "–",
          ],
          [
            "Target on bottom · correct",
            bias && bias.targetBottomAccuracy !== null
              ? formatPercentPrecise(bias.targetBottomAccuracy)
              : "–",
            bias ? formatCount(bias.targetBottomCorrect) : "–",
            bias ? formatCount(bias.targetBottomN) : "–",
          ],
          [
            "d′ (sensitivity)",
            bias && bias.dPrime !== null ? formatFixed2(bias.dPrime) : "–",
            "–",
            "–",
          ],
          [
            "Criterion (side bias)",
            bias && bias.criterion !== null ? formatFixed2(bias.criterion) : "–",
            "–",
            "–",
          ],
        ]}
      />
    </section>
  );
}
