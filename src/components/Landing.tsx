// The public landing page (NIL-43) - the eight-strip, research-framed
// composition of record (SPEC-view-designs §3 + ledger V15-V19; mockup
// docs/design/view-adjudication-mockups/landing-composition.html). Chrome only:
// bespoke sections + the shadcn Button (§5 scope fence) - no frozen strings, no
// new components, no new deps. Every stat traces to docs/research/thesis-facts.md
// (§3/§4/§9). Adopted copy (strips 1/2/4/5) is UI-SYSTEM §10.5, verbatim; strip 6
// is the V15 Observatory draft; strip 8 attribution is V17 and string-matches the
// Observatory footer (src/observatory/Observatory.tsx). Kana in chrome is the
// practice-set specimen only (L4 fence): ガタン (p0), never a core-pool word.

import { useState } from "react";
import { Button } from "./ui/button";
import type { ModeId } from "../modes";

type LandingProps = {
  /** Enter a mode: hero + live cards + the dissociation CTA route here. When
      logged out, App gates through auth (register tab) then applies the mode. */
  onPlayMode: (mode: ModeId) => void;
  /** Strip 6 CTA → the public Observatory (D1: public deep-link). */
  onVisitObservatory: () => void;
};

/** §10.6 / L5 identity motif - a seismograph blip: a line that depicts sound is
    itself iconicity. Static; stroke comes from the shared `.wave-rule` class. */
function WaveRule({ width = 120 }: { width?: number }) {
  const path =
    width >= 180
      ? "M2 7 L14 7 L20 2 L30 12 L40 3 L50 11 L58 7 L94 7 L100 4 L108 10 L114 7 L178 7"
      : "M2 7 L10 7 L16 3 L26 11 L34 4 L42 10 L48 7 L118 7";
  return (
    <svg
      className="wave-rule"
      width={width}
      height="14"
      viewBox={`0 0 ${width} 14`}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const LIVE_MODES: { measure: string; title: string; copy: string; mode: ModeId }[] =
  [
    {
      measure: "Measure · Guessing",
      title: "Meaning Match",
      copy: "The core task: two words, one meaning. Includes the Script Lab.",
      mode: "choosing",
    },
    {
      measure: "Measure · Reflection",
      title: "Rating Lab",
      copy: "How much does this word sound like what it means? 1–7.",
      mode: "rating",
    },
    {
      measure: "Journey · Perception",
      title: "Perception Ladder",
      copy: "Climb from sound to inner states; accuracy falls as feelings deepen.",
      mode: "ladder",
    },
    {
      measure: "Measure · Production",
      title: "Word Mint",
      copy: "See a meaning, invent the word, scored feature by feature against the real one.",
      mode: "production",
    },
  ];

// Honest coming-soon (§2.3 / §9): full-opacity copy, an "In the works" pill, no
// dead links. Perception Ladder shipped (NIL-42) and Word Mint shipped (NIL-62),
// so both moved up to LIVE_MODES.
// The XL card is the resolved "Polyglot Challenge" name (D3, Nils 2026-07-07).
const SOON_MODES: { measure: string; title: string; copy: string }[] = [
  {
    measure: "Structure · Patterns",
    title: "Word Anatomy",
    copy: "Which sound shapes carry which meanings: the system behind the words.",
  },
  {
    measure: "Transfer · 5 languages",
    title: "Polyglot Challenge",
    copy: "Does your ear generalize? Ideophones beyond Japanese.",
  },
];

// D4: the thesis links to its LUP canonical record (Nils, 2026-07-07).
const THESIS_URL = "https://lup.lub.lu.se/student-papers/record/9214474";

export default function Landing({ onPlayMode, onVisitObservatory }: LandingProps) {
  // E1 slot (§3.2 / V16): render the NIL-81 scatter export, but never hard-require
  // it - a missing/failed asset falls back to the token-styled wave placeholder.
  const [e1Failed, setE1Failed] = useState(false);

  return (
    <div className="landing">
      {/* 1 · HERO (§10.5.1 adopted; motif = L5 wave + L4 practice kana) */}
      <section className="hero" aria-labelledby="hero-h1">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 id="hero-h1">
              You've never heard this language. You'll still get most of these right.
            </h1>
            <WaveRule width={180} />
            <p className="hero-sub">
              Ideophone Arena is a live replication of a real experiment on sound
              symbolism: words whose shape carries their meaning. Guess, rate, and
              see how far your ear takes you before convention takes over.
            </p>
            <div className="cta-row">
              <Button type="button" onClick={() => onPlayMode("choosing")}>
                Prove it: play a round
              </Button>
              <Button asChild variant="outline">
                <a href="#observatory">Read the research</a>
              </Button>
            </div>
          </div>
          <div className="hero-motif">
            <p className="kana-specimen">
              <span lang="ja">ガタン</span>
              <small>gatan · with a bang. Hear it?</small>
            </p>
          </div>
        </div>
      </section>

      {/* 2 · THE NUMBERS (§10.5.2 adopted; raised FILL, no shadow - §1) */}
      <section className="strip washi" aria-label="The numbers">
        <div className="numbers-inner">
          <div className="stat-card">
            <span className="specimen">Choosing task · N = 36</span>
            <p className="stat-figure">64%</p>
            <p>
              mean guessing accuracy for people with no knowledge of the language.
              Pure chance would be 50%. Can you beat the cohort?
            </p>
          </div>
          <div className="stat-card">
            <span className="specimen">Accuracy by sense</span>
            <p className="stat-figure">
              <span className="mod-a">Sound</span>{" "}
              <span className="arrow" aria-hidden="true">
                ▶
              </span>{" "}
              <span className="mod-v">Sight</span>{" "}
              <span className="arrow" aria-hidden="true">
                ▶
              </span>{" "}
              <span className="mod-i">Inner&nbsp;states</span>
            </p>
            <p>accuracy slides from 6.86 to 6.42 to 5.97 out of 10 as meanings turn inward.</p>
          </div>
          <div className="stat-card">
            <span className="specimen">The hardest word</span>
            <p className="stat-figure">36%</p>
            <p>
              <em>shobon</em> (downhearted), the one word the cohort guessed worse
              than a coin flip.
            </p>
          </div>
        </div>
      </section>

      {/* 3 · HOW IT WORKS (§10.5.3) */}
      <section className="strip" aria-labelledby="how-h2">
        <div className="read">
          <h2 id="how-h2">How it works</h2>
          <WaveRule />
          <ol className="steps">
            <li>
              <span className="specimen">1 · Listen</span>
              <p>
                Two words play, one meaning shown. Both words are real; they
                contrast within one sense.
              </p>
            </li>
            <li>
              <span className="specimen">2 · Trust your ear</span>
              <p>
                Pick the word you think carries the meaning. No knowledge of the
                language needed; that's the experiment.
              </p>
            </li>
            <li>
              <span className="specimen">3 · See the data</span>
              <p>
                Every answer gets the thesis's numbers for that pair: how the
                original cohort did on it.
              </p>
            </li>
          </ol>
          <p className="honesty">
            Your guesses join the arena record: the thesis pairs and the ones added
            since, still collecting data.
          </p>
        </div>
      </section>

      {/* 4 · THE DISSOCIATION (§10.5.4 adopted; binding line). ρ values are
          McLean 2023's cross-scale correlations, not thesis numbers. */}
      <section className="strip washi dissoc" aria-labelledby="dissoc-h2">
        <div className="read">
          <h2 id="dissoc-h2">Your gut and your reflection disagree.</h2>
          <WaveRule />
          <p>
            <em>dokidoki</em>, a racing heartbeat, was rated the most word-like
            word in the whole study. People still couldn't reliably guess it.{" "}
            <strong>Ratings detect ideophone-ness; guessing doesn't.</strong>
          </p>
          <p className="footnote">
            Across scales the two measures correlate at ρ ≈ +.44 / +.65: related,
            far from interchangeable. That gap is what the Rating Lab measures.
          </p>
          <div className="cta-row">
            <Button variant="outline" type="button" onClick={() => onPlayMode("rating")}>
              Try the Rating Lab
            </Button>
          </div>
        </div>
      </section>

      {/* 5 · SCRIPT LAB TEASER (§10.5.5 adopted; framing rule - "presentation
          changes the experience," never "matched script helps"). */}
      <section className="strip" aria-labelledby="script-h2">
        <div className="read">
          <h2 id="script-h2">Presentation changes the experience.</h2>
          <WaveRule />
          <p className="script-body">
            Seeing the script didn't change how well people guessed; it changed how
            the words <em>felt</em> (audio-only raters: 4.50; script raters: 4.15).
            In the Script Lab you pick your own presentation and feel the difference.
          </p>
        </div>
      </section>

      {/* 6 · THE OBSERVATORY (V15; E1 slot with binding fallback, V16;
          art-left / copy-right mirrors the hero). */}
      <section className="strip washi" id="observatory" aria-labelledby="obs-h2">
        <div className="obs-inner">
          <div className="obs-art">
            {e1Failed ? (
              <div className="e1-fallback">
                <svg width="220" height="20" viewBox="0 0 220 20" aria-hidden="true">
                  <path
                    className="e1-wave"
                    d="M2 10 L20 10 L28 3 L40 17 L52 5 L62 14 L70 10 L120 10 L128 6 L138 14 L146 10 L218 10"
                  />
                </svg>
                <span className="specimen">Figure slot · NIL-81 export</span>
              </div>
            ) : (
              <img
                className="e1-image"
                src="/observatory-strip.png"
                alt="Scatter plot: each word placed by how often the cohort guessed it right against how word-like they rated it; the two measures diverge."
                onError={() => setE1Failed(true)}
              />
            )}
          </div>
          <div className="obs-copy">
            <h2 id="obs-h2">The arena keeps score of itself.</h2>
            <WaveRule />
            <p>
              Every guess and rating feeds a public research dashboard: the same
              charts the thesis drew, redrawn live as players test its claims out of
              sample. Thesis baselines stay pinned; the live layer grows.
            </p>
            <div className="cta-row">
              <Button variant="outline" type="button" onClick={onVisitObservatory}>
                Visit the Observatory
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · MODES GRID (§2.3 shell; six cards; honest coming-soon) */}
      <section className="strip" aria-labelledby="modes-h2">
        <div className="read">
          <h2 id="modes-h2">Six ways to test your ear</h2>
          <WaveRule />
        </div>
        <div className="mode-grid">
          {LIVE_MODES.map((mode) => (
            <button
              key={mode.title}
              className="landing-mode-card"
              type="button"
              onClick={() => onPlayMode(mode.mode)}
            >
              <span className="specimen">{mode.measure}</span>
              <h3>{mode.title}</h3>
              <p>{mode.copy}</p>
              <span className="mode-status" />
            </button>
          ))}
          {SOON_MODES.map((mode) => (
            <article
              key={mode.title}
              className="landing-mode-card"
              aria-disabled="true"
            >
              <span className="specimen">{mode.measure}</span>
              <h3>{mode.title}</h3>
              <p>{mode.copy}</p>
              <span className="mode-status">
                <span className="specimen pill">In the works</span>
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* 8 · PROVENANCE + ATTRIBUTION (V17; credit set string-matches the
          Observatory footer - Winter et al. is not in the footer, so not here). */}
      <footer className="provenance">
        <p>
          Built on the author's MA thesis data; every number on this page is from
          the study. (
          <a href={THESIS_URL} target="_blank" rel="noopener noreferrer">
            Paulsson (2025), Unimodal and Cross-Modal Iconicity in Japanese
            Ideophones
          </a>
          )
        </p>
        <p>
          Dingemanse (2012) · McLean (2021) · McLean, Dunn &amp; Dingemanse (2023) ·
          Iida &amp; Akita (2023)
        </p>
        <p>
          Reference data: McLean, Dunn &amp; Dingemanse (2023), CC BY 4.0 · Iida &amp;
          Akita (2023) perceptual-strength norms. This deployment is non-commercial;
          research data is reproduced with attribution.
        </p>
      </footer>
    </div>
  );
}
