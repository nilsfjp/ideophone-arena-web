import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

// Token-purity + motion-gate guard (spec §11.3.2), the successor to the old
// "values live only in tokens" intent under Tailwind:
//   1. No raw hex colors outside tokens.css (its oklch provenance comments are
//      the sanctioned home for hex).
//   2. No CSS `transition:` / `animation:` declaration outside a
//      `prefers-reduced-motion: no-preference` block.
//   3. No Tailwind `transition-*` / `animate-*` utility without a `motion-safe:`
//      variant in component source.
// Reserved-slot geometry stability is asserted at runtime by the browser loop
// (§2.4), so it is not re-checked here.

const SRC = join(process.cwd(), "src");
const TOKENS_FILE = join("src", "styles", "tokens.css");
// Dev-only, excluded from the build; not shipped chrome. The /styleguide tree
// (and its css) intentionally hardcodes palette hex to document the tokens.
const SKIP = new Set([join("src", "styles", "styleguide.css")]);
const STYLEGUIDE_DIR = join("src", "styleguide");

const problems = [];

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function stripJsComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

// #rgb / #rgba / #rrggbb / #rrggbbaa - a color literal. The trailing \b makes a
// longer hex run (e.g. a >8-char git SHA) fail to match, since there is no word
// boundary within the first 3-8 chars; `#leaderboard` fails (l is not hex) and
// `word #9` fails (too few digits). No pre-strip is needed - and a pre-strip
// that consumed 4-8-digit runs would blind the guard to the common #rrggbb form.
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function checkHex(rel, code) {
  code.split("\n").forEach((line, i) => {
    const m = line.match(HEX);
    if (m) {
      problems.push(`${rel}:${i + 1} raw hex color "${m[0]}" - use a token`);
    }
  });
}

function checkCssMotion(rel, code) {
  const stack = [];
  let prelude = "";
  let line = 1;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === "\n") line++;
    if (ch === "{") {
      stack.push(/@media[^{}]*prefers-reduced-motion:\s*no-preference/.test(prelude));
      prelude = "";
    } else if (ch === "}") {
      stack.pop();
      prelude = "";
    } else {
      prelude += ch;
      if (prelude.endsWith("transition:") || prelude.endsWith("animation:")) {
        if (!stack.some(Boolean)) {
          const prop = prelude.endsWith("animation:") ? "animation" : "transition";
          problems.push(
            `${rel}:${line} CSS ${prop} outside a prefers-reduced-motion: no-preference block`,
          );
        }
      }
    }
  }
}

function checkTsxMotion(rel, code) {
  const re = /(transition|animate)-/g;
  let m;
  while ((m = re.exec(code))) {
    const before = code.slice(Math.max(0, m.index - 12), m.index);
    if (!before.endsWith("motion-safe:")) {
      const line = code.slice(0, m.index).split("\n").length;
      problems.push(
        `${rel}:${line} Tailwind "${m[0]}*" utility without a motion-safe: variant`,
      );
    }
  }
}

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(abs);
      continue;
    }
    const rel = relative(process.cwd(), abs);
    if (SKIP.has(rel) || rel.startsWith(STYLEGUIDE_DIR)) continue;
    if (rel.endsWith(".css")) {
      const code = stripCssComments(await readFile(abs, "utf8"));
      if (rel !== TOKENS_FILE) checkHex(rel, code);
      checkCssMotion(rel, code);
    } else if (/\.(ts|tsx)$/.test(rel) && !rel.endsWith(".test.ts") && !rel.endsWith(".test.tsx")) {
      const code = stripJsComments(await readFile(abs, "utf8"));
      checkHex(rel, code);
      checkTsxMotion(rel, code);
    }
  }
}

await walk(SRC);

if (problems.length > 0) {
  console.error("Token-purity / motion-gate violations:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Token purity and motion gating verified.");
