// Authored preview - the real shadcn Input from window.IdeophoneArena. Raised
// fill is the form-affordance exception in the surface grammar (§1); the border
// is the -mid affordance weight, and focus is the vermillion outline (§6).
import { Input } from "ideophone-arena-web";

const wrap: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-3)",
  maxWidth: 320,
  padding: "var(--space-4)",
};

// Placeholder, filled, and disabled states.
export const States = () => (
  <div style={wrap}>
    <Input placeholder="Choose a display name" />
    <Input defaultValue="kirakira_fan" />
    <Input type="password" defaultValue="secret" />
    <Input placeholder="Unavailable" disabled />
  </div>
);
