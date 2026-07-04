import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * shadcn Button, themed on the ink-and-paper tokens (spec §5/§6). Motion is
 * opt-in (motion-safe: on the color transition, §7); focus is the vermillion
 * outline shared with the bespoke layer (§6). Disabled = opacity .62 (§6).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-body font-bold cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion disabled:pointer-events-none disabled:opacity-[0.62] motion-safe:transition-colors motion-safe:duration-[var(--motion-micro)] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-vermillion text-ink-inverse hover:bg-vermillion-hover active:bg-vermillion-active",
        destructive:
          "bg-destructive text-ink-inverse hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-border-mid bg-surface-raised text-ink hover:border-vermillion",
        secondary:
          "border border-border-mid bg-surface-raised text-ink hover:border-vermillion",
        ghost: "bg-transparent text-ink hover:bg-accent hover:text-accent-foreground",
        link: "text-vermillion underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-[1.2rem] py-[0.7rem] text-[length:var(--text-ui)] leading-[1.2]",
        sm: "min-h-11 px-[0.9rem] py-[0.55rem] text-[length:var(--text-ui)] leading-[1.2]",
        lg: "min-h-11 px-6 py-3 text-[length:var(--text-ui)] leading-[1.2]",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
