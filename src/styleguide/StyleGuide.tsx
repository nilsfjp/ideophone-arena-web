// DEV-ONLY style guide (Checkpoint 1): token palette, candidate font
// pairings, and feedback states for the "laboratory ink and paper" identity.
// Trial wording is imported from experimentText - frozen strings are never
// duplicated as literals (CLAUDE.md invariant 1).
import { useState } from "react";
import {
  CHOICE_QUESTION_PREFIX,
  CHOICE_QUESTION_SUFFIX,
  LISTEN_INSTRUCTION,
  MEANING_OTHER_PREFIX,
  MEANING_TARGET_PREFIX,
} from "../experimentText";

type Swatch = {
  token: string;
  hex: string;
  note?: string;
  inkOn?: string;
};

const SURFACE_SWATCHES: Swatch[] = [
  { token: "--surface-page", hex: "#E8E3D9", note: "page ground" },
  { token: "--surface-card", hex: "#FBF8F2", note: "washi card" },
  { token: "--surface-raised", hex: "#FFFFFF", note: "raised panel" },
];

const INK_SWATCHES: Swatch[] = [
  { token: "--ink-primary", hex: "#211E19", note: "sumi text ink" },
  { token: "--ink-muted", hex: "#5E5749", note: "secondary text" },
  { token: "--vermillion", hex: "#C8401F", note: "vermillion (shu-iro)" },
  { token: "--vermillion-hover", hex: "#B23618", note: "accent hover" },
  { token: "--vermillion-active", hex: "#9E3015", note: "accent active" },
];

const MODALITY_SWATCHES: Swatch[] = [
  { token: "--modality-auditory", hex: "#8A5512", note: "auditory (thesis #9C6114)" },
  { token: "--modality-auditory-soft", hex: "#EBD7B0", note: "auditory fill" },
  { token: "--modality-visual", hex: "#99454F", note: "visual (thesis #E9C4C7)" },
  { token: "--modality-visual-soft", hex: "#E9C4C7", note: "visual fill" },
  {
    token: "--modality-interoceptive",
    hex: "#386376",
    note: "interoceptive (thesis #B9D3DC)",
  },
  { token: "--modality-interoceptive-soft", hex: "#B9D3DC", note: "interoceptive fill" },
];

const FEEDBACK_SWATCHES: Swatch[] = [
  { token: "--positive", hex: "#2A6B43", note: "correct" },
  { token: "--positive-soft", hex: "#ADCAB8", note: "correct fill" },
  { token: "--negative", hex: "#9D2C1A", note: "incorrect" },
  { token: "--negative-soft", hex: "#E3C0B8", note: "incorrect fill" },
];

type Pairing = {
  id: string;
  className: string;
  name: string;
  display: string;
  body: string;
  rationale: string;
  flags?: string;
};

const PAIRINGS: Pairing[] = [
  {
    id: "a",
    className: "sg-pair-a",
    name: "Pairing A · Warm Lab (production, 2026-06-13)",
    display: "Zen Maru Gothic (headings)",
    body: "LINE Seed JP",
    rationale:
      "Production config: headings in rounded maru-gothic; body and stimulus kana in LINE Seed JP (OFL 1.1): body 400, stimuli Bold 700; shared DNA between copy and cards, with the rounded headings keeping the warm-lab voice distinct. This section renders the real production faces.",
  },
];

// Sample round: pair a0 (gosogoso / katakata) in the incongruent display the
// brief asks for (ゴソゴソ / かたかた). Meanings follow the thesis stimulus
// list; in the real app every string below the instruction line arrives from
// the backend.
const SAMPLE_TARGET = "rustling";
const SAMPLE_OTHER = "clattering";

type AccentVariant = "vermillion" | "rose" | "rose-soft" | "hybrid";
type FontVariant = "production" | "ls-headings" | "ls-all";

export default function StyleGuide() {
  const [accent, setAccent] = useState<AccentVariant>("vermillion");
  const [fonts, setFonts] = useState<FontVariant>("production");
  const pageClassName = [
    "sg-page",
    accent === "rose" ? "sg-accent-rose" : "",
    accent === "rose-soft" ? "sg-accent-rose-soft" : "",
    accent === "hybrid" ? "sg-accent-hybrid" : "",
    fonts === "ls-headings" ? "sg-fonts-ls-headings" : "",
    fonts === "ls-all" ? "sg-fonts-ls-all" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pageClassName}>
      <header className="sg-header">
        <p className="sg-dev-badge">Dev-only style guide · not part of the game</p>
        <h1>
          Ideophone Arena <span className="sg-header-kana">ゴソゴソ</span>
        </h1>
        <p className="sg-thesis">
          Laboratory ink and paper: editorial and scientific, warm rather than
          sterile. The playfulness is carried by the kana and the game moments,
          never by decoration.
        </p>
      </header>

      {/* Preview-only what-if switches; production tokens are untouched. */}
      <div className="sg-variant-bar">
        <fieldset className="sg-variant-group">
          <legend>Accent (preview)</legend>
          <VariantRadio
            checked={accent === "vermillion"}
            label="Vermillion #C8401F (production)"
            name="sg-accent"
            onSelect={() => setAccent("vermillion")}
          />
          <VariantRadio
            checked={accent === "rose"}
            label="Rose #99454F (visual hue, 6.3:1 on white)"
            name="sg-accent"
            onSelect={() => setAccent("rose")}
          />
          <VariantRadio
            checked={accent === "rose-soft"}
            label="Rose soft #E9C4C7 (visual fill + ink text, deep-rose accents)"
            name="sg-accent"
            onSelect={() => setAccent("rose-soft")}
          />
          <VariantRadio
            checked={accent === "hybrid"}
            label="Hybrid (vermillion CTAs + rose-soft selection chrome)"
            name="sg-accent"
            onSelect={() => setAccent("hybrid")}
          />
        </fieldset>
        <fieldset className="sg-variant-group">
          <legend>Fonts (preview)</legend>
          <VariantRadio
            checked={fonts === "production"}
            label="Production (Zen Maru headings + LINE Seed body)"
            name="sg-fonts"
            onSelect={() => setFonts("production")}
          />
          <VariantRadio
            checked={fonts === "ls-headings"}
            label="LINE Seed headings"
            name="sg-fonts"
            onSelect={() => setFonts("ls-headings")}
          />
          <VariantRadio
            checked={fonts === "ls-all"}
            label="LINE Seed everything"
            name="sg-fonts"
            onSelect={() => setFonts("ls-all")}
          />
        </fieldset>
      </div>

      <section className="sg-section" aria-labelledby="sg-palette-title">
        <h2 id="sg-palette-title">Token palette</h2>
        <SwatchGroup title="Surfaces" swatches={SURFACE_SWATCHES} />
        <SwatchGroup title="Ink & accent" swatches={INK_SWATCHES} />
        <SwatchGroup title="Modality trio (thesis figures)" swatches={MODALITY_SWATCHES} />
        <SwatchGroup title="Feedback" swatches={FEEDBACK_SWATCHES} />

        <h3>Controls on paper</h3>
        <div className="sg-controls-row">
          <button className="sg-button-primary" type="button">
            Start Game
          </button>
          <button className="sg-button-secondary" type="button">
            Sound check
          </button>
          <button className="sg-button-primary" type="button" disabled>
            Disabled
          </button>
          <span className="sg-practice-badge">Not scored</span>
        </div>
        <div className="sg-progress-track" aria-hidden="true">
          <span style={{ width: "40%" }} />
        </div>

        <h3>Selection chrome (Script Lab)</h3>
        <div className="sg-condition-row">
          <button className="sg-condition" type="button">
            Audio only
          </button>
          <button className="sg-condition sg-condition-active" type="button">
            Script match
          </button>
          <button className="sg-condition" type="button">
            Script mismatch
          </button>
        </div>
      </section>

      {PAIRINGS.map((pairing) => (
        <PairingSpecimen key={pairing.id} pairing={pairing} />
      ))}

      <footer className="sg-footer">
        <p>
          All faces self-hosted woff2 via @fontsource (SIL OFL 1.1), Latin +
          Japanese unicode-range subsets. Contrast figures annotated in
          tokens.css.
        </p>
      </footer>
    </div>
  );
}

function VariantRadio({
  checked,
  label,
  name,
  onSelect,
}: {
  checked: boolean;
  label: string;
  name: string;
  onSelect: () => void;
}) {
  return (
    <label className="sg-variant-option">
      <input checked={checked} name={name} type="radio" onChange={onSelect} />
      <span>{label}</span>
    </label>
  );
}

function SwatchGroup({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <>
      <h3>{title}</h3>
      <ul className="sg-swatch-grid">
        {swatches.map((swatch) => (
          <li className="sg-swatch" key={swatch.token}>
            <span
              className="sg-swatch-chip"
              style={{ background: `var(${swatch.token})` }}
            />
            <code>{swatch.token}</code>
            <span className="sg-swatch-meta">
              {swatch.hex}
              {swatch.note ? ` · ${swatch.note}` : null}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function PairingSpecimen({ pairing }: { pairing: Pairing }) {
  return (
    <section
      className={`sg-section sg-pairing ${pairing.className}`}
      aria-labelledby={`sg-pairing-${pairing.id}`}
    >
      <h2 id={`sg-pairing-${pairing.id}`}>{pairing.name}</h2>
      <p className="sg-pairing-meta">
        Display: <strong>{pairing.display}</strong> · Body:{" "}
        <strong>{pairing.body}</strong>: {pairing.rationale}
        {pairing.flags ? (
          <span className="sg-pairing-flag"> {pairing.flags}</span>
        ) : null}
      </p>

      <div className="sg-mock-board">
        <p className="sg-mock-instruction">{LISTEN_INSTRUCTION}</p>

        <div className="sg-mock-cards">
          <MockCard side="A" kana="ゴソゴソ" />
          <MockCard side="B" kana="かたかた" />
        </div>

        <p className="sg-mock-translation">
          {MEANING_TARGET_PREFIX}
          <strong>{SAMPLE_TARGET}</strong>
        </p>
        <p className="sg-mock-translation">
          {MEANING_OTHER_PREFIX}
          <strong>{SAMPLE_OTHER}</strong>
        </p>
        <p className="sg-mock-question">
          {CHOICE_QUESTION_PREFIX}
          <strong>{SAMPLE_TARGET}</strong>
          {CHOICE_QUESTION_SUFFIX}
        </p>
      </div>

      <p className="sg-body-sample">
        In this task, you will see two ideophones and their English
        meanings. Ideophones are words that depict sensory experience: a
        rustle, a glitter, a heartbeat. Listen to both words, then choose the
        card you think matches the highlighted meaning. 0123456789 · AaBbGgRr
      </p>

      <div className="sg-feedback-row">
        <article className="sg-feedback sg-feedback-correct">
          <h3>Correct</h3>
          <p className="sg-feedback-side">Card B</p>
          <p className="sg-feedback-kana">カタカタ</p>
          <p className="sg-feedback-detail">
            katakata · <em>{SAMPLE_OTHER}</em>
          </p>
        </article>
        <article className="sg-feedback sg-feedback-incorrect">
          <h3>Incorrect</h3>
          <p className="sg-feedback-side">Card A</p>
          <p className="sg-feedback-kana">ゴソゴソ</p>
          <p className="sg-feedback-detail">
            gosogoso · <em>{SAMPLE_TARGET}</em>
          </p>
        </article>
      </div>

      <div className="sg-script-sanity">
        <h3>Script sanity · chouonpu &amp; sokuon</h3>
        <p className="sg-script-sample">
          ジャージャー きゃーきゃー サクッと どきどき ドキドキ
        </p>
        <p className="sg-script-romaji">
          jaajaa · kyaakyaa · sakutto · dokidoki (both scripts)
        </p>
      </div>
    </section>
  );
}

function MockCard({ side, kana }: { side: string; kana: string }) {
  return (
    <button className="sg-mock-card" type="button" aria-label={`Choose card ${side}`}>
      <span className="sg-mock-card-side">{side}</span>
      <span className="sg-mock-card-kana">{kana}</span>
    </button>
  );
}
