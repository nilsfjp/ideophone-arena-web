# design-sync notes - ideophone-arena-web

Repo-specific gotchas for future syncs. One bullet per gotcha.

## Shape & build
- This is a **Vite app**, not a packaged component library. `package.json` is `private`
  with no `main`/`module`/`exports`. There is no library `dist/` entry - the converter runs
  in **synth-entry mode** from `src/` (no `--entry`). `dist/` is the app bundle; ignore it.
- Components use **default exports** (`export default function TrialPlayer`). `componentSrcMap`
  pins each Name → src file so the synth entry re-exports the default under its name.
  `Leaderboard.tsx` additionally has a named `LeaderboardPanel` export.
- `App` (router root) and `StyleGuide` (dev-only `/styleguide.html`) are excluded via
  `componentSrcMap: null` - not reusable design-system components.

## Expanded scope (2026-07-05, NIL-63 rider - user chose "widest")
- Went from 9 bespoke surfaces to **20 component cards**: added `ModeSelect`, `RatingLab`,
  and the themed **shadcn primitive layer** (`Button`, `Card`, `Checkbox`, `Dialog`, `Input`,
  `Label`, `Table`, `Tabs`, `Toaster`) - all pinned in `componentSrcMap`.
- **Compound primitives ship one card each; their sub-parts stay bundle-only.** The synth
  entry's `export * from <ui file>` forwards every named export (TableHeader, DialogContent,
  CardHeader, TabsList, …) to `window.IdeophoneArena` for composition, while only the top-level
  name is in `componentSrcMap` → one card, not 35 noisy ones. Same trick exposes RatingLab's
  panels (`RatingTrialPanel`, `RatingInstructionsPanel`, `RatingRevealContent`, `LabRecordPanel`,
  `RatingDonePanel`, `RatingEmptyState`) while `RatingLab` is the single card. NO fork change was
  needed - the existing source-kit.mjs fork already handles the mixed default/named case.
- `RatingLab`'s default export is the backend-coupled orchestrator (fetches on mount) - its
  preview composes the exported panels instead, so the card is rich without a floor.
- `cfg.overrides` card-layout additions: `ModeSelect`/`RatingLab`/`Table` = `cardMode: column`
  (wide); `Dialog` = `cardMode: single` + `viewport: 560x400` (overlay renders centered in-card).
- Grouping is left at `general` for all 20 (the `ui/` dir is a GENERIC_DIR, collapses to
  general). A future polish could split a `primitives` group via a small source-kit fork; not
  worth the fork-maintenance now.

## Styling & fonts
- `cssEntry = .design-sync/ds-bundle-styles.css` - a GENERATED, self-contained sheet written
  by `cfg.buildCmd` (`node .design-sync/build-css.mjs`). **Post-NIL-65 the app is Tailwind v4**:
  `src/styles/app.css` does `@import "tailwindcss"` plus `@import`s of tokens.css / theme.css /
  shadcn-bridge.css, and the shipped UI (bespoke surfaces AND the shadcn primitive layer)
  styles itself with generated utility classes. The OLD naive concat left `@import "tailwindcss"`
  unexpanded → no utilities, no `@theme` vars → every card rendered unstyled. So build-css.mjs
  now runs the real **Tailwind v4 CLI** over app.css: expands the used utilities (content-scanned
  from src/ + .design-sync/previews/), inlines the token/theme/bridge imports, emits a stand-alone
  sheet with ZERO `@font-face`. **Requires `@tailwindcss/cli` in `.ds-sync`** (see per-clone setup).
  Re-run on every sync (the driver runs buildCmd). Tokens are surface-relative semantic props.
- **Fonts are NOT in the CSS closure.** The app imports `@fontsource` subset CSS via JS in
  `src/main.tsx` (line-seed-jp, zen-maru-gothic, zen-kaku-gothic-new; latin+japanese 400/700).
  So a bare `cssEntry` scrape misses them → `[FONT_MISSING]`. Resolved via `cfg.extraFonts`
  pointing at the exact `@fontsource/*/{latin,japanese}-{400,700}.css` subset files the app
  imports. If you add/remove a weight in main.tsx, mirror it in extraFonts.

## Component coupling (preview authoring)
- Components are app-internal: the backend API client (`src/api/client.ts`, JWT in
  localStorage) and audio playback. Expect floor cards where static render is
  impossible. (react-router was removed in the NIL-65/27C migration - the app is a
  single view-state shell in `App.tsx`; no RouterProvider is needed anymore.)
- Experiment invariants in CLAUDE.md are FROZEN - participant-facing strings live in
  `src/experimentText.ts`. Preview compositions must render real components; never rephrase
  frozen strings or reimplement trial logic.

## Synth-entry self-symlink (required each clone)
- PKG_DIR resolves to `node_modules/<pkg>`, which doesn't exist for the app's own
  repo. A self-symlink fixes it: `ln -sfn .. node_modules/ideophone-arena-web`.
  Recreate on a fresh clone (node_modules is gitignored). Without it the build
  dies: `ENOENT … node_modules/ideophone-arena-web/package.json`.
- Fork symlink for the overrides also needed per clone:
  `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` (so the forked
  source-kit.mjs can resolve ts-morph/esbuild).
- **`@tailwindcss/cli` per clone**: the converter deps install (`npm i esbuild ts-morph
  @types/react` in `.ds-sync`) does NOT include the Tailwind CLI that `build-css.mjs` needs.
  Add it: `(cd .ds-sync && npm i @tailwindcss/cli@4)`. build-css.mjs resolves it from
  `.ds-sync/node_modules` (falls back to the repo's own node_modules); without it, buildCmd
  exits 1 with an install hint.

## Forks & overrides in play
- `.design-sync/overrides/source-kit.mjs` (declared in cfg.libOverrides): the
  synth entry (a) uses ONLY componentSrcMap-pinned files (keeps app entry points
  like main.tsx out, which would inline @fontsource fonts → 48 MB CSS), and
  (b) emits `export { default as <Name> }` because the components are DEFAULT
  exports and `export *` does not forward defaults ([BUNDLE_EXPORT]).
  On re-sync, diff this fork against the bundled lib/source-kit.mjs and merge
  upstream changes.
- `cfg.buildCmd` = `node .design-sync/build-css.mjs`: **rewritten 2026-07-05** - Tailwind-
  compiles `src/styles/app.css` into the self-contained `.design-sync/ds-bundle-styles.css`
  used as cssEntry (see "Styling & fonts" above for why the old concat broke post-migration).
  copyTokens only works with a separate tokens PACKAGE, so this is how the ~169 design/bridge
  tokens AND the compiled utilities reach the bundle. Re-run on every sync (the driver runs
  buildCmd). NOT a lib fork (standalone buildCmd script) - no `cfg.libOverrides` entry.
- `cfg.extraEntries` / `router-reexport.mjs` (MemoryRouter re-export) were removed
  in NIL-63 along with the `HomePage`/`ResultsPage`/`NotFoundPage` componentSrcMap
  rows and previews - react-router is gone, so there is no router coupling left to
  bridge.
- `cfg.docsMap.Instructions = null`: the dead archived
  docs/instruction-archive/INSTRUCTIONS.md slug-matched the Instructions
  component; excluded so its prompt.md is synthesized. (CLAUDE.md: INSTRUCTIONS.md
  is archived - ignore it.)
- `cfg.overrides.TrialPlayer.cardMode = "column"`: the trial board is wider than
  a grid cell.

## Known render warns (triaged - not new on re-sync)
- StimulusPlayback ships the FLOOR CARD by design: it's an invisible audio engine
  (renders null / hidden <audio>, or a "Play" fallback only after a blocked
  autoplay) with no static visual. Not authored; not a failure.
- Toaster (sonner) ships the FLOOR CARD by design: an invisible chrome-level toast
  HOST - nothing renders until a toast fires at runtime, so there is no static
  visual. Not authored; not a failure. (Same class as StimulusPlayback.)

## Preview authoring notes
- 18/20 components have authored previews, all graded good (StimulusPlayback + Toaster
  are the two floor cards). Bespoke surfaces are coupled to backend data - previews use
  inline mock RoundResponse/IdeophoneOption/RatingPoolWord/LabRecordRow/etc. shadcn
  primitive previews use inline styles + the components' own classes (no preview-only
  utility classes, so Tailwind content-scanning is not load-bearing for them).
- Leaderboard is the LIVE data-fetching wrapper; with no backend its card shows
  the empty + "backend unavailable" state. LeaderboardPanel is the presentational
  table (authored with real rows). This is intentional - keep both.
- TrialPlayer/IdeophoneCard previews show a no-audio state (no stimulus source in
  preview); that's honest, not broken.

## Re-sync risks
- Mock data in previews is inline and tied to the current prop shapes
  (RoundResponse, IdeophoneOption, ConditionPresentation, AnswerResultResponse,
  LeaderboardPageResponse, and now RatingPoolWord/RatableWordResponse, LabRecordRow,
  RatingRevealData, RatingTrialPanelProps). If api/types.ts or RatingLab's panel
  signatures change those shapes, the previews may render wrong or fail to compile -
  re-grade after any types change.
- **Tailwind content-scan drift**: `ds-bundle-styles.css` only contains the utilities the
  Tailwind CLI finds in the scanned tree (src/ + .design-sync/previews/). If a shadcn
  component starts using a NEW utility class, it's covered (it's in src). But a preview that
  introduces a preview-only utility not used anywhere in src would render unstyled - keep
  preview layout glue on inline styles / tokens (current previews already do).
- **shadcn API drift**: conventions.md enumerates the primitives' `variant`/`size` values and
  sub-part names from the ui/*.tsx source. If a primitive's cva variants or exports change,
  re-validate the header (the enumerated names) against the fresh build.
- Frozen experiment strings live in src/experimentText.ts; previews render the
  real components so the copy is verbatim. Don't hand-author component copy.
- conventions.md enumerates token/class names - if tokens.css/app.css/theme.css/
  shadcn-bridge.css rename any, re-validate the header against the fresh build. (2026-07-05
  re-sync: all 40 tokens + 9 utilities + 26 bespoke classes + 49 exports validated present.)
