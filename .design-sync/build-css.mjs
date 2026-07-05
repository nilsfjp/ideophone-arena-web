// Produces a self-contained, Tailwind-compiled stylesheet for the design-sync
// bundle (cfg.buildCmd → cfg.cssEntry; the driver re-runs it every sync).
//
// Post-NIL-65 the app is Tailwind v4: src/styles/app.css does `@import
// "tailwindcss"` plus `@import`s of tokens.css / theme.css / shadcn-bridge.css,
// and the shipped UI (bespoke experiment surfaces AND the shadcn primitive
// layer) styles itself with generated utility classes. The old naive concat
// (tokens.css + app.css) left `@import "tailwindcss"` UNEXPANDED — no utilities,
// no @theme custom properties — so every preview card rendered unstyled.
//
// So we run the real Tailwind v4 compiler over app.css. It: expands the used
// utilities (content-scanned from the repo — src/ and .design-sync/previews/,
// node_modules and gitignored trees skipped), inlines the token/theme/bridge
// @imports, and emits a stand-alone sheet with NO dangling @import. app.css
// imports no fonts (main.tsx does, via JS), so the output has ZERO @font-face —
// fonts still reach the bundle through cfg.extraFonts, unchanged.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const input = join(repo, 'src/styles/app.css');
const output = join(here, 'ds-bundle-styles.css');

// Resolve the Tailwind v4 CLI. Prefer the isolated converter deps (.ds-sync),
// fall back to the repo's own node_modules. Per-clone setup installs
// @tailwindcss/cli into .ds-sync alongside esbuild/ts-morph (see NOTES.md).
function resolveCli() {
  const direct = [
    join(repo, '.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs'),
    join(repo, 'node_modules/@tailwindcss/cli/dist/index.mjs'),
  ].find((p) => existsSync(p));
  if (direct) return direct;
  for (const base of ['.ds-sync', '.']) {
    try {
      return createRequire(join(repo, base, 'noop.js')).resolve('@tailwindcss/cli');
    } catch {
      /* try next */
    }
  }
  return null;
}

const cli = resolveCli();
if (!cli) {
  console.error(
    '[build-css] @tailwindcss/cli not found. Install it into the converter deps:\n' +
      '  (cd .ds-sync && npm i @tailwindcss/cli@4)\n' +
      'See .design-sync/NOTES.md (per-clone setup).',
  );
  process.exit(1);
}

// Tailwind v4 auto-detects content from the CWD downward, so run from the repo
// root regardless of who invoked us — that scans src/ AND .design-sync/previews/
// (neither gitignored) while skipping node_modules and the gitignored build dirs.
const res = spawnSync(process.execPath, [cli, '-i', input, '-o', output], {
  cwd: repo,
  stdio: ['ignore', 'inherit', 'inherit'],
});
if (res.status !== 0) {
  console.error(`[build-css] tailwind compile failed (exit ${res.status ?? 'signal ' + res.signal})`);
  process.exit(res.status || 1);
}
console.error(
  `build-css: wrote ${output} (${(readFileSync(output).length / 1024).toFixed(0)} KB, Tailwind v4 compiled)`,
);
