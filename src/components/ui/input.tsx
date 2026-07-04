import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * shadcn Input, themed. Raised fill is the affordance exception in the surface
 * grammar (§1) — form inputs use --surface-raised without a shadow. Border is
 * the -mid affordance weight (§6); focus is the vermillion outline (§6);
 * 44px min height (§9.2 touch target).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-h-11 rounded-md border border-input bg-surface-raised px-[0.75rem] py-[0.6rem] text-base text-ink",
        "placeholder:text-ink-muted",
        "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent hover:border-border-strong",
        "disabled:cursor-not-allowed disabled:opacity-[0.62]",
        "motion-safe:transition-colors motion-safe:duration-[var(--motion-micro)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
