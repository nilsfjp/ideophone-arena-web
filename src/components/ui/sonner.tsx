import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * shadcn sonner Toaster, themed. CHROME-LEVEL toasts only (auth expiry,
 * network loss) - spec §5: must NEVER replace in-trial status lines, which are
 * reserved slots (§2.4). Toasts are overlays, so they carry the raised surface
 * and --shadow-raised (§1). Themed to our tokens via CSS vars (the app is
 * light-only this session; a dark re-map stays possible later).
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        className:
          "font-body rounded-md border border-border bg-popover text-popover-foreground shadow-raised",
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
