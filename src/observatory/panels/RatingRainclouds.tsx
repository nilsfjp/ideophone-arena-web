// The spread - rating distributions by modality (SPEC-stats-dashboard §3.4,
// rainclouds v1.1). Per trio modality, the live 1–7 iconicity ratings as a
// raincloud - half-violin (KDE) + quartile box + seeded-jitter raw dots - over
// the thesis distribution as a faint reference silhouette behind. Raincloud
// over ridgeline (settled): the raw dots SHOW thin n instead of smoothing a
// dozen ratings into fake confidence. Vermillion is the arena's own live data;
// the thesis reference rides ink. n per tier lives in the specimen label.

import { area, curveLinear } from "d3-shape";
import { thesisRatings } from "../../data/observatory";
import type { TrioModality } from "../../data/observatory";
import { type ApiTrioModality } from "../chart/aggregate";
import { Axis } from "../chart/axis";
import { CollapsedTable } from "../chart/CollapsedTable";
import { formatCount } from "../chart/format";
import { kdeCurve, type KdePoint } from "../chart/kde";
import {
  countsForModality,
  dotSample,
  expandCounts,
  quartilesFromCounts,
  RATING_MAX,
  RATING_MIN,
  type Quartiles,
  type RaincloudDot,
} from "../chart/rainclouds";
import { makeLinearScale } from "../chart/scales";
import { SpecimenText } from "../chart/SpecimenLabel";
import { useChartSize } from "../chart/useChartSize";
import type { RatingDistributionsState } from "../Observatory";

type RowSpec = {
  api: ApiTrioModality;
  key: TrioModality;
  /** Landing vocabulary + research term (§10.5), uppercased by CSS. */
  label: string;
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

const SHORT_LABEL_WIDTH = 520;
const M_LEFT = 16;
const M_RIGHT = 16;
const TOP = 12;
const TIER_H = 120;
const AXIS_H = 30;
const VIOLIN_MAX = 40;
/** Vertical half-band the raw dots jitter within (px). Value stays on x. */
const DOT_BAND = 9;
const RATING_TICKS = [1, 2, 3, 4, 5, 6, 7] as const;

type Tier = {
  spec: RowSpec;
  liveCounts: number[] | null;
  liveN: number;
  liveKde: KdePoint[];
  liveQ: Quartiles | null;
  dots: RaincloudDot[];
  dotsShown: number;
  dotsTotal: number;
  thesisCounts: number[];
  thesisN: number;
  thesisKde: KdePoint[];
  thesisMedian: number | null;
};

type RaincloudProps = {
  distributions: RatingDistributionsState;
};

export default function RatingRainclouds({ distributions }: RaincloudProps) {
  const { ref, width } = useChartSize();
  const live = distributions.status === "ready" ? distributions.data : null;
  const unreachable = distributions.status === "error";

  const tiers: Tier[] = ROW_SPECS.map((spec) => {
    const liveCounts = live ? countsForModality(live, spec.api) : null;
    const liveExpanded = liveCounts ? expandCounts(liveCounts) : [];
    const thesis = thesisRatings.byModality[spec.key];
    const thesisCounts = [...thesis.counts];
    const sample = liveCounts
      ? dotSample(spec.api, liveCounts)
      : { dots: [], shown: 0, total: 0 };
    return {
      spec,
      liveCounts,
      liveN: live ? (live.byModalityN[spec.api] ?? 0) : 0,
      liveKde:
        liveExpanded.length > 0
          ? kdeCurve(liveExpanded, { min: RATING_MIN, max: RATING_MAX })
          : [],
      liveQ: liveCounts ? quartilesFromCounts(liveCounts) : null,
      dots: sample.dots,
      dotsShown: sample.shown,
      dotsTotal: sample.total,
      thesisCounts,
      thesisN: thesis.n,
      thesisKde: kdeCurve(expandCounts(thesisCounts), {
        min: RATING_MIN,
        max: RATING_MAX,
      }),
      thesisMedian: quartilesFromCounts(thesisCounts)?.median ?? null,
    };
  });

  const height = TOP + tiers.length * TIER_H + AXIS_H;
  const x = makeLinearScale([RATING_MIN, RATING_MAX], [M_LEFT, width - M_RIGHT]);
  const violinArea = (baseline: number) =>
    area<KdePoint>()
      .curve(curveLinear)
      .x((d) => x(d.x))
      .y0(baseline)
      .y1((d) => baseline - d.y * VIOLIN_MAX);

  const thinned = tiers.filter((t) => t.dotsTotal > t.dotsShown);
  const plotMidX = M_LEFT + (width - M_LEFT - M_RIGHT) / 2;

  return (
    <section className="observatory-panel observatory-panel--rainclouds">
      <h2>The spread · how each modality is rated</h2>
      <p className="observatory-panel-copy">
        Every 1–7 iconicity rating in the arena, per modality, as a cloud of raw
        judgements over the thesis distribution behind. A handful of ratings
        shows as dots; the curve earns its shape as the record grows.
      </p>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <rect
              x="1"
              y="4"
              width="12"
              height="6"
              className="legend-swatch--thesis"
              fillOpacity={0.4}
            />
          </svg>
          <span className="specimen-label">Thesis · N = 360 per modality</span>
        </span>
        <span className="chart-legend-item">
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="4" className="legend-swatch--arena" />
          </svg>
          <span className="specimen-label">Arena · live</span>
        </span>
      </div>
      <figure className="chart-figure" ref={ref}>
        <svg
          role="img"
          aria-label="Rating distributions from 1 to 7 per modality: the live arena raincloud over the thesis reference; full values in the data table."
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
        >
          {tiers.map((tier, i) => {
            const y0 = TOP + i * TIER_H;
            const labelY = y0 + 14;
            const baseline = y0 + 66;
            const boxCenter = baseline + 16;
            const dotBase = baseline + 40;
            return (
              <g key={tier.spec.key} className="raincloud-tier">
                <SpecimenText x={M_LEFT} y={labelY}>
                  {width < SHORT_LABEL_WIDTH
                    ? tier.spec.shortLabel
                    : tier.spec.label}
                </SpecimenText>
                <SpecimenText x={width - M_RIGHT} y={labelY} textAnchor="end">
                  {/* Unreachable record ≠ zero ratings - null is not 0. */}
                  {live === null ? "N = –" : `N = ${formatCount(tier.liveN)}`}
                </SpecimenText>

                {/* thesis reference silhouette, behind everything */}
                <path
                  className="raincloud-violin--thesis"
                  d={violinArea(baseline)(tier.thesisKde) ?? ""}
                  aria-hidden="true"
                />

                {/* live raincloud: violin + quartile box + raw dots */}
                {tier.liveKde.length > 0 ? (
                  <path
                    className="raincloud-violin--arena"
                    d={violinArea(baseline)(tier.liveKde) ?? ""}
                    aria-hidden="true"
                  />
                ) : null}
                {tier.liveQ ? (
                  <g className="raincloud-box-group" aria-hidden="true">
                    <line
                      className="raincloud-whisker"
                      x1={x(tier.liveQ.min)}
                      x2={x(tier.liveQ.max)}
                      y1={boxCenter}
                      y2={boxCenter}
                    />
                    <rect
                      className="raincloud-box"
                      x={x(tier.liveQ.q1)}
                      y={boxCenter - 6}
                      width={Math.max(0, x(tier.liveQ.q3) - x(tier.liveQ.q1))}
                      height={12}
                    />
                    <line
                      className="raincloud-median"
                      x1={x(tier.liveQ.median)}
                      x2={x(tier.liveQ.median)}
                      y1={boxCenter - 7}
                      y2={boxCenter + 7}
                    />
                  </g>
                ) : null}
                {tier.dots.map((dot, di) => (
                  <circle
                    key={di}
                    className="raincloud-dot"
                    cx={x(dot.value)}
                    cy={dotBase + dot.jitter * DOT_BAND}
                    r={1.8}
                    aria-hidden="true"
                  />
                ))}
                {live !== null && tier.liveN === 0 ? (
                  <SpecimenText
                    className="raincloud-awaiting"
                    x={plotMidX}
                    y={dotBase + 4}
                    textAnchor="middle"
                  >
                    Awaiting the first rating
                  </SpecimenText>
                ) : null}
              </g>
            );
          })}

          <Axis
            orientation="bottom"
            scale={x}
            ticks={RATING_TICKS}
            tickFormat={(t) => String(t)}
            transform={`translate(0, ${TOP + tiers.length * TIER_H})`}
          />
          <SpecimenText x={plotMidX} y={height - 4} textAnchor="middle">
            Rating · 1–7
          </SpecimenText>
        </svg>
        <figcaption className="chart-notes">
          <span>
            Curves are peak-normalized: they show the shape of each modality's
            ratings, not how many. Sample sizes live in the labels.
          </span>
          <span>
            The thesis silhouette behind each cloud is the same 30 words, rated
            by 36 participants (360 ratings a modality).
          </span>
          <span>
            Live ratings are elicited under instructions that name no
            language, wording the thesis cohort never saw.
          </span>
          {thinned.length > 0 ? (
            <span>
              {thinned
                .map(
                  (t) =>
                    `${t.spec.shortLabel}: showing ${formatCount(
                      t.dotsShown,
                    )} of ${formatCount(t.dotsTotal)} ratings as dots`,
                )
                .join("; ")}
              .
            </span>
          ) : null}
          <span>
            Live means include practice rounds and any automated traffic. A
            server-side exclusion is pending; read the shapes, not the exact
            counts.
          </span>
          {unreachable ? (
            <span>The live layer is unreachable right now.</span>
          ) : null}
        </figcaption>
      </figure>
      <CollapsedTable
        tableId="observatory-rainclouds-table"
        caption="Rating counts 1–7 per modality: live arena and thesis reference, with medians."
        columns={[
          "Modality",
          "Layer",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "n",
          "Median",
        ]}
        rows={tiers.flatMap((tier) => {
          const liveRow = [
            tier.spec.label,
            "Arena",
            ...(tier.liveCounts ?? [0, 0, 0, 0, 0, 0, 0]).map((c) =>
              live === null ? "–" : formatCount(c),
            ),
            live === null ? "–" : formatCount(tier.liveN),
            tier.liveQ ? tier.liveQ.median.toFixed(1) : "–",
          ];
          const thesisRow = [
            tier.spec.label,
            "Thesis",
            ...tier.thesisCounts.map((c) => formatCount(c)),
            formatCount(tier.thesisN),
            tier.thesisMedian !== null ? tier.thesisMedian.toFixed(1) : "–",
          ];
          return [liveRow, thesisRow];
        })}
      />
    </section>
  );
}
