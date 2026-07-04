import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "../../lib/utils";

/**
 * shadcn Checkbox, themed. Used by the Instructions practice toggle. The check
 * glyph is an inline SVG path (no icon package, per the dep gate). Checked =
 * vermillion fill; focus is the vermillion outline (§6).
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[1.15rem] shrink-0 rounded-sm border border-input bg-surface-raised cursor-pointer",
        "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion",
        "data-[state=checked]:border-vermillion data-[state=checked]:bg-vermillion data-[state=checked]:text-ink-inverse",
        "disabled:cursor-not-allowed disabled:opacity-[0.62]",
        "motion-safe:transition-colors motion-safe:duration-[var(--motion-micro)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[0.85rem]"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
