// Authored preview — the real shadcn Checkbox from window.IdeophoneArena.
// Checked = vermillion fill with an inline-SVG check. Its live use is the
// Instructions "Include practice rounds" toggle, composed here with a Label.
import { Checkbox, Label } from "ideophone-arena-web";

const wrap: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};

// Unchecked / checked / disabled, plus the labelled practice-toggle composition.
export const States = () => (
  <div style={wrap}>
    <div style={rowStyle}>
      <Checkbox id="c1" />
      <Label htmlFor="c1">Unchecked</Label>
    </div>
    <div style={rowStyle}>
      <Checkbox id="c2" defaultChecked />
      <Label htmlFor="c2">Include 2 practice rounds (not scored)</Label>
    </div>
    <div style={rowStyle}>
      <Checkbox id="c3" defaultChecked disabled />
      <Label htmlFor="c3">Disabled</Label>
    </div>
  </div>
);
