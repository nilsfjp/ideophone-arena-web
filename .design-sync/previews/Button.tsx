// Authored preview - the real shadcn Button from window.IdeophoneArena, themed
// on the ink-and-paper tokens. Variant is the primary axis; sizes and the
// disabled state round it out. Vermillion is the default (primary) fill.
import { Button } from "ideophone-arena-web";

const row: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
};

// The full variant set, ink-and-paper themed.
export const Variants = () => (
  <div style={row}>
    <Button>Start rating</Button>
    <Button variant="secondary">Back to modes</Button>
    <Button variant="outline">Cancel</Button>
    <Button variant="ghost">Skip</Button>
    <Button variant="link">Learn more</Button>
    <Button variant="destructive">Log out</Button>
  </div>
);

// Size scale (all keep the 44px min touch target, §9.2).
export const Sizes = () => (
  <div style={row}>
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
);

// Enabled vs disabled (opacity .62).
export const States = () => (
  <div style={row}>
    <Button>Enabled</Button>
    <Button disabled>Disabled</Button>
  </div>
);
