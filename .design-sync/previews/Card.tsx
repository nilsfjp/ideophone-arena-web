// Authored preview — the real shadcn Card family from window.IdeophoneArena.
// Per the surface grammar (§1) chrome cards sit FLAT on washi: a hairline
// border, no shadow (elevation is reserved for the instrument's voice).
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "ideophone-arena-web";

const wrap: React.CSSProperties = { maxWidth: 360, padding: "var(--space-4)" };

// A composed card: header (title + description), content, and a footer action.
export const Composed = () => (
  <div style={wrap}>
    <Card style={{ padding: "var(--space-4)" }}>
      <CardHeader>
        <CardTitle>Rating Lab</CardTitle>
        <CardDescription>
          Listen again to words you have met and rate how much each resembles
          its meaning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ color: "var(--ink-muted)", fontSize: "var(--text-sm)" }}>
          Your lab record already holds 3 words you rated earlier.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Start rating</Button>
        <Button size="sm" variant="ghost">
          Back
        </Button>
      </CardFooter>
    </Card>
  </div>
);
