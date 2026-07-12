// Authored preview - the real shadcn Label from window.IdeophoneArena. Label is
// control text (body-bold, §3.1); it lives above its field, so the honest story
// is the labelled field the auth form composes.
import { Label, Input } from "ideophone-arena-web";

const field: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-2)",
  maxWidth: 320,
  padding: "var(--space-4)",
};

// A labelled input, wired by htmlFor - the auth-form field composition.
export const LabelledField = () => (
  <div style={field}>
    <Label htmlFor="display-name">Display name</Label>
    <Input id="display-name" placeholder="Choose a display name" />
  </div>
);
