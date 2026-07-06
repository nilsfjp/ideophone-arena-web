// Shared axis renderer: hairline gridlines on --border-soft, specimen-label
// tick text (UI-SYSTEM §3.4 / SPEC-stats-dashboard §2). Rendered inside the
// panel's SVG; the panel owns placement via the transform prop.

import { SpecimenText } from "./SpecimenLabel";

type AxisProps = {
  orientation: "bottom" | "left";
  scale: (value: number) => number;
  ticks: readonly number[];
  tickFormat: (value: number) => string;
  /** When set, extends each tick into a gridline of this length across the
   * plot (upward for bottom axes, rightward for left axes). */
  gridLength?: number;
  transform?: string;
};

export function Axis({
  orientation,
  scale,
  ticks,
  tickFormat,
  gridLength = 0,
  transform,
}: AxisProps) {
  return (
    <g className="chart-axis" transform={transform} aria-hidden="true">
      {ticks.map((tick) => {
        const at = scale(tick);
        return orientation === "bottom" ? (
          <g key={tick} transform={`translate(${at}, 0)`}>
            {gridLength > 0 ? (
              <line className="chart-gridline" y2={-gridLength} />
            ) : null}
            <line className="chart-tick" y2={4} />
            <SpecimenText y={18} textAnchor="middle">
              {tickFormat(tick)}
            </SpecimenText>
          </g>
        ) : (
          <g key={tick} transform={`translate(0, ${at})`}>
            {gridLength > 0 ? (
              <line className="chart-gridline" x2={gridLength} />
            ) : null}
            <line className="chart-tick" x2={-4} />
            <SpecimenText x={-8} dy="0.32em" textAnchor="end">
              {tickFormat(tick)}
            </SpecimenText>
          </g>
        );
      })}
    </g>
  );
}
