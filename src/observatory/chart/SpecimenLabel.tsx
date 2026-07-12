// The specimen label as a component (UI-SYSTEM §3.4): the small-caps tracked
// primitive that unifies the app's labels, here serving axis text, legends,
// chips, and figures. Two render targets - HTML span and SVG text - share the
// same tokens via classes defined in observatory.css. Labels are authored
// uppercase in code; the CSS carries size, weight, and tracking.

import type { HTMLAttributes, SVGProps } from "react";
import { cn } from "../../lib/utils";

type SpecimenLabelProps = HTMLAttributes<HTMLSpanElement> & {
  /** Bordered pill variant (§3.4) - e.g. the RECORD · ALL PLAYERS chip. */
  pill?: boolean;
};

export function SpecimenLabel({
  pill = false,
  className,
  ...rest
}: SpecimenLabelProps) {
  return (
    <span
      className={cn(
        "specimen-label",
        pill && "specimen-label--pill",
        className,
      )}
      {...rest}
    />
  );
}

/** SVG twin for in-chart labels (axis titles, chance line, crosshair). */
export function SpecimenText({
  className,
  ...rest
}: SVGProps<SVGTextElement>) {
  return <text className={cn("specimen-text", className)} {...rest} />;
}
