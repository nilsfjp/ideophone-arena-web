import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../lib/utils";

/**
 * shadcn Tabs, themed to the app's existing segmented-control look (auth tabs,
 * completion tabs): a bordered washi container with an ink-filled active
 * trigger. Motion is opt-in (§7); focus is the vermillion outline (§6).
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-[var(--space-4)]", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-md border border-border-mid bg-card",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-11 min-w-[108px] items-center justify-center px-[1rem] py-[0.7rem] text-[length:var(--text-ui)] leading-[1.2] text-ink cursor-pointer",
        "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vermillion",
        "data-[state=active]:bg-ink data-[state=active]:text-ink-inverse",
        "disabled:cursor-not-allowed disabled:opacity-[0.62]",
        "motion-safe:transition-colors motion-safe:duration-[var(--motion-micro)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
