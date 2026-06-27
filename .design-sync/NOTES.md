# design-sync notes — ideophone-arena-web

Repo-specific gotchas for future syncs. One bullet per gotcha.

## Shape & build
- This is a **Vite app**, not a packaged component library. `package.json` is `private`
  with no `main`/`module`/`exports`. There is no library `dist/` entry — the converter runs
  in **synth-entry mode** from `src/` (no `--entry`). `dist/` is the app bundle; ignore it.
- Components use **default exports** (`export default function TrialPlayer`). `componentSrcMap`
  pins each Name → src file so the synth entry re-exports the default under its name.
  `Leaderboard.tsx` additionally has a named `LeaderboardPanel` export.
- `App` (router root) and `StyleGuide` (dev-only `/styleguide.html`) are excluded via
  `componentSrcMap: null` — not reusable design-system components.

## Styling & fonts
- `cssEntry = src/styles/app.css`, which `@import`s `./tokens.css` (the design tokens — the
  real design layer). Tokens are surface-relative semantic custom properties.
- **Fonts are NOT in the CSS closure.** The app imports `@fontsource` subset CSS via JS in
  `src/main.tsx` (line-seed-jp, zen-maru-gothic, zen-kaku-gothic-new; latin+japanese 400/700).
  So a bare `cssEntry` scrape misses them → `[FONT_MISSING]`. Resolved via `cfg.extraFonts`
  pointing at the exact `@fontsource/*/{latin,japanese}-{400,700}.css` subset files the app
  imports. If you add/remove a weight in main.tsx, mirror it in extraFonts.

## Component coupling (preview authoring)
- Components are app-internal: react-router (pages), the backend API client
  (`src/api/client.ts`, JWT in localStorage), and audio playback. Expect provider needs
  (RouterProvider) and floor cards where static render is impossible.
- Experiment invariants in CLAUDE.md are FROZEN — participant-facing strings live in
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

## Forks & overrides in play
- `.design-sync/overrides/source-kit.mjs` (declared in cfg.libOverrides): the
  synth entry (a) uses ONLY componentSrcMap-pinned files (keeps app entry points
  like main.tsx out, which would inline @fontsource fonts → 48 MB CSS), and
  (b) emits `export { default as <Name> }` because the components are DEFAULT
  exports and `export *` does not forward defaults ([BUNDLE_EXPORT]).
  On re-sync, diff this fork against the bundled lib/source-kit.mjs and merge
  upstream changes.
- `cfg.buildCmd` = `node .design-sync/build-css.mjs`: concatenates tokens.css +
  app.css (minus its `@import "./tokens.css"`) into the self-contained
  `.design-sync/ds-bundle-styles.css` used as cssEntry. copyTokens only works
  with a separate tokens PACKAGE, so this is how the 55 design tokens reach the
  bundle. Re-run on every sync (the driver runs buildCmd).
- `cfg.extraEntries` re-exports `MemoryRouter` (./.design-sync/router-reexport.mjs)
  onto the global so router-coupled previews share the bundle's react-router-dom
  instance. Preview imports MUST take MemoryRouter from 'ideophone-arena-web',
  not 'react-router-dom'.
- `cfg.docsMap.Instructions = null`: the dead archived
  docs/instruction-archive/INSTRUCTIONS.md slug-matched the Instructions
  component; excluded so its prompt.md is synthesized. (CLAUDE.md: INSTRUCTIONS.md
  is archived — ignore it.)
- `cfg.overrides.TrialPlayer.cardMode = "column"`: the trial board is wider than
  a grid cell.

## Known render warns (triaged — not new on re-sync)
- StimulusPlayback ships the FLOOR CARD by design: it's an invisible audio engine
  (renders null / hidden <audio>, or a "Play" fallback only after a blocked
  autoplay) with no static visual. Not authored; not a failure.

## Preview authoring notes
- 11/12 components have authored previews, all graded good. Components are coupled
  to backend data — previews use inline mock RoundResponse/IdeophoneOption/etc.
- Leaderboard is the LIVE data-fetching wrapper; with no backend its card shows
  the empty + "backend unavailable" state. LeaderboardPanel is the presentational
  table (authored with real rows). This is intentional — keep both.
- TrialPlayer/IdeophoneCard previews show a no-audio state (no stimulus source in
  preview); that's honest, not broken.

## Re-sync risks
- Mock data in previews is inline and tied to the current prop shapes
  (RoundResponse, IdeophoneOption, ConditionPresentation, AnswerResultResponse,
  LeaderboardPageResponse). If api/types.ts changes those shapes, the previews
  may render wrong or fail to compile — re-grade after any types change.
- Frozen experiment strings live in src/experimentText.ts; previews render the
  real components so the copy is verbatim. Don't hand-author component copy.
- conventions.md enumerates token/class names — if tokens.css/app.css rename
  any, re-validate the header against the fresh build.
