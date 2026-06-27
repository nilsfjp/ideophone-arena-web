# Ideophone Arena — how to build with this design system

React 19 + TypeScript. Every component is on `window.IdeophoneArena.*` (bundle:
root `_ds_bundle.js`). This is the UI of a 2AFC ideophone experiment (a research
instrument): a "laboratory ink and paper" identity — warm paper surfaces, sumi
ink, a vermillion accent, and a thesis-figure modality trio.

## Styling idiom: design tokens + semantic class names

Style via **CSS custom properties** defined in the shipped stylesheet, applied
through **semantic class names** — there is no utility-class system and no
style-prop API. To match the brand, use the tokens (not raw hex/px) for any new
layout glue you write, and reuse the component class names below.

Read the truth before styling: `_ds/<folder>/styles.css` → `_ds_bundle.css`
(it defines all tokens AND the component rules), and each component's
`<Name>.prompt.md` + `<Name>.d.ts`.

Token families (all `var(--*)`):

| Family | Tokens |
|---|---|
| Surfaces | `--surface-page`, `--surface-card`, `--surface-raised` |
| Ink | `--ink-primary`, `--ink-muted`, `--ink-inverse` |
| Accent | `--accent`, `--accent-hover`, `--accent-active` (vermillion) |
| Modality | `--accent-auditory`, `--accent-visual`, `--accent-interoceptive` (+ `-soft` fills) |
| State | `--positive`, `--negative` (+ `-soft`) |
| Borders | `--border-soft`, `--border-mid`, `--border-strong`, `--focus-ring` |
| Fonts | `--font-body`, `--font-display`, `--font-stimuli` (Japanese kana) |
| Type scale | `--text-xs … --text-2xl`, plus `--text-kana-card`, `--text-kana-feedback` |
| Space | `--space-1 … --space-8` |
| Radius / shadow | `--radius-sm/md/lg/pill`, `--shadow-card`, `--shadow-raised` |

Component class vocabulary (reuse, don't reinvent): `.ideophone-card`,
`.choice-button`, `.stimulus-display`, `.feedback` (+ `.feedback-choice-grid`,
`.feedback-choice-card`), `.instructions`, `.script-lab-selector`,
`.condition-option`, `.auth-form` / `.auth-panel`, `.score-section`,
`.leaderboard-pager`, `.primary-button`, `.secondary-button`, `.muted`,
`.error-text`.

## Wrapping & setup

- **No global provider is required** — components read tokens from the shipped
  CSS, not a theme context. Just ensure `styles.css` (and its `@import`
  closure) is loaded.
- **Router-coupled components** (`NotFoundPage` renders a `<Link>`) must be
  wrapped in a router. A `MemoryRouter` is re-exported on the bundle global —
  `window.IdeophoneArena.MemoryRouter` — use that one (a `MemoryRouter` from a
  separately-imported `react-router-dom` yields a null router context).
- **Experiment components are data-driven.** `TrialPlayer`, `IdeophoneCard`,
  `StimulusDisplay`, and `FeedbackPanel` take backend shapes — `RoundResponse`,
  `IdeophoneOption` (`displayForm`/`canonicalForm`/`romaji`), `ConditionPresentation`
  (`kind: "audio-only" | "script-match" | "script-mismatch"`), and
  `AnswerResultResponse`. See each `<Name>.d.ts`. `StimulusPlayback` is an
  audio engine with no static visual (it fetches stimulus audio at runtime).
- **Frozen wording**: participant-facing trial text is fixed by the research
  design — render the components verbatim; never paraphrase their copy.

## Idiomatic snippet

```tsx
const { IdeophoneCard } = window.IdeophoneArena;

<div style={{ display: "grid", gap: "var(--space-4)", maxWidth: 320 }}>
  <IdeophoneCard
    option={{ ideophoneId: 1, displayForm: "きらきら", romaji: "kirakira" }}
    presentation={{ kind: "script-match", label: "Script match", description: "" }}
    positionLabel="A"
    meaning="glittering, sparkling"
    revealDetails
  />
</div>
```
