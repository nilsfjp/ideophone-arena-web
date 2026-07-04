import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "../../lib/utils";

/**
 * shadcn Label, themed. Control text is body-bold (§3.1 Control role). The
 * grid gap to its field is set by the consumer (auth form layout).
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "font-body font-bold text-base leading-[var(--leading-tight)] select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-[0.62]",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
