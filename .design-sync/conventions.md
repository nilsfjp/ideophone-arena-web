# Ideophone Arena - how to build with this design system

React 19 + TypeScript. Every component is on `window.IdeophoneArena.*` (bundle:
root `_ds_bundle.js`). This is the UI of a 2AFC ideophone experiment (a research
instrument): a "laboratory ink and paper" identity - warm paper (washi)
surfaces, sumi ink, a vermillion accent, and a thesis-figure modality trio.

Two layers, both styled from the same tokens: **bespoke experiment surfaces**
(the trial, rating, mode, leaderboard, auth screens) and a **themed shadcn/ui
primitive layer** (Button, Card, Input, Table, Tabs, Dialog, Checkbox, Label,
Toaster).

## Styling idiom

The app runs **Tailwind v4**. Three compatible ways to style, in order of
preference:

1. **Design tokens** (`var(--*)`) - the source of truth for color/space/type/
   radius/shadow. Use tokens (never raw hex/px) for any custom layout glue so it
   stays on-brand.
2. **Tailwind v4 utility classes** - the shipped `styles.css` carries the
   compiled utilities the components use (e.g. `inline-flex`, `items-center`,
   `rounded-md`, `gap-2`, `border`). Brand utilities map onto the tokens
   (`bg-vermillion`, `text-ink`, `bg-card`, `border-border-mid`).
3. **shadcn primitives via props** - the primitive layer is configured through
   `variant`/`size` props (below), not by overriding its classes.

Bespoke surfaces render from an `@layer app` of **semantic class names** and
append no utilities; the shadcn primitives render from utilities + `data-slot`
attributes. Read the truth before styling: `_ds/<folder>/styles.css` →
`_ds_bundle.css` (defines every token AND the component/utility rules), plus each
`<Name>.prompt.md` + `<Name>.d.ts`.

Token families (all `var(--*)`):

| Family | Tokens |
|---|---|
| Surfaces | `--surface-page`, `--surface-card`, `--surface-raised` |
| Ink | `--ink-primary`, `--ink-muted`, `--ink-inverse` |
| Accent | `--vermillion`, `--vermillion-hover`, `--vermillion-active` |
| Modality | `--modality-auditory`, `--modality-visual`, `--modality-interoceptive`, `--modality-haptic` (+ `-soft` fills) |
| State | `--positive`, `--negative` (+ `-soft`) |
| Borders | `--border-soft`, `--border-mid`, `--border-strong`, `--focus-ring` |
| Fonts | `--font-body`, `--font-display`, `--font-stimuli` (Japanese kana) |
| Type scale | `--text-xs … --text-2xl`, `--text-kana-card`, `--text-kana-feedback` |
| Space / radius / shadow | `--space-1 … --space-8`, `--radius-sm/md/lg/pill`, `--shadow-card`, `--shadow-raised` |
| shadcn bridge aliases | `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--border`, `--input`, `--destructive` (map the primitive layer onto the ink-and-paper tokens) |

## Components

**shadcn primitives** - import from the bundle; the props ARE the API:

- `Button` - `variant`: default | secondary | outline | ghost | link |
  destructive; `size`: default | sm | lg | icon. Vermillion is the default fill.
- `Card` + `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` /
  `CardFooter` - flat on washi (hairline border, no shadow).
- `Input`, `Label`, `Checkbox` - form controls (raised fill, vermillion
  focus/check).
- `Table` + `TableHeader` / `TableBody` / `TableRow` / `TableHead` /
  `TableCell` / `TableCaption` - self-scrolls horizontally.
- `Tabs` + `TabsList` / `TabsTrigger` / `TabsContent` - segmented control
  (`defaultValue`, or controlled `value` / `onValueChange`).
- `Dialog` + `DialogContent` / `DialogHeader` / `DialogTitle` /
  `DialogDescription` / `DialogFooter` / `DialogTrigger` / `DialogClose` -
  overlay (the one at-rest surface allowed `--shadow-raised`).
- `Toaster` - chrome-level toast host; mount once, fire toasts via sonner's
  `toast()`.

**Bespoke surfaces** - data-driven (backend shapes; see each `<Name>.d.ts`):
`TrialPlayer`, `IdeophoneCard`, `StimulusDisplay`, `FeedbackPanel`,
`Instructions`, `ModeSelect` (`modes` + `onSelect`), `RatingLab` (its
presentational panels `RatingTrialPanel`, `RatingInstructionsPanel`,
`RatingRevealContent`, `LabRecordPanel`, `RatingDonePanel`, `RatingEmptyState`
are exported alongside it), `Leaderboard` (live-fetching) / `LeaderboardPanel`
(presentational table), `AuthForm`. `StimulusPlayback` is an audio engine with
no static visual.

Bespoke class vocabulary (reuse, don't reinvent): `.ideophone-card`,
`.card-slot`, `.card-replay-button`, `.choice-button`, `.stimulus-display`,
`.feedback` (+ `.feedback-choice-grid`, `.feedback-choice-card`),
`.instructions`, `.mode-select` / `.mode-list` / `.mode-card`, `.rating-lab` /
`.rating-scale` / `.rating-scale-button`, `.script-lab-selector`,
`.condition-option`, `.auth-form` / `.auth-panel`, `.score-section`,
`.leaderboard-pager`, `.primary-button`, `.secondary-button`, `.muted`,
`.error-text`.

## Wrapping & setup

- **No global provider required** - components read tokens from the shipped CSS,
  not a theme context. Load `styles.css` (and its `@import` closure). For toasts,
  mount `<Toaster />` once at the app root.
- **No router** - the app is a single view-state shell (`App.tsx`).
- **Frozen wording** - participant-facing trial/rating text is fixed by the
  research design; render the components verbatim, never paraphrase their copy.

## Idiomatic snippet

```tsx
const { Card, CardHeader, CardTitle, CardDescription, CardFooter, Button } =
  window.IdeophoneArena;

<Card style={{ padding: "var(--space-4)", maxWidth: 360 }}>
  <CardHeader>
    <CardTitle>Rating Lab</CardTitle>
    <CardDescription>Rate how much each word resembles its meaning.</CardDescription>
  </CardHeader>
  <CardFooter>
    <Button size="sm">Start rating</Button>
    <Button size="sm" variant="ghost">Back</Button>
  </CardFooter>
</Card>
```
