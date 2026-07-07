// The Observatory — the arena's read-only research surface (SPEC-stats-
// dashboard). A separate AppView, not a mode card: it records nothing and
// renders no trial surface; the live API surface is the public research
// aggregates (divergence, rating-distributions, position-bias). Strips follow
// the §1 narrative arc: header → the claim (dumbbell) → the two measures
// (scatter) → the fingerprint (radar) → the spread (rainclouds) → the integrity
// strip (position bias) → honest coming-soon slots → attribution.

import { useEffect, useMemo, useState } from "react";
import {
  getAllMyRatings,
  getDivergence,
  getPositionBias,
  getRatingDistributions,
} from "../api/client";
import type {
  DivergenceEntry,
  PositionBiasResponse,
  RatingDistributionsResponse,
} from "../api/types";
import { Button } from "../components/ui/button";
import { playerMeanRating, recordTotals } from "./chart/aggregate";
import { formatCount } from "./chart/format";
import { SpecimenLabel } from "./chart/SpecimenLabel";
import DivergenceScatter from "./panels/DivergenceScatter";
import IntegrityStrip from "./panels/IntegrityStrip";
import ModalityDumbbell from "./panels/ModalityDumbbell";
import RatingRainclouds from "./panels/RatingRainclouds";
import WordRadar from "./panels/WordRadar";

export type DivergenceState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rows: DivergenceEntry[] };

export type RatingDistributionsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: RatingDistributionsResponse };

export type PositionBiasState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: PositionBiasResponse };

export type SessionMarker = {
  /** Session accuracy 0–1, from the completion panel. */
  accuracy: number;
  /** Player's mean 1–7 rating; null until loaded / when they have none. */
  meanRating: number | null;
};

/** §10.6 identity motif: a seismograph blip — form depicting sound. Static. */
function WaveRule() {
  return (
    <svg
      className="wave-rule"
      viewBox="0 0 160 14"
      width="160"
      height="14"
      aria-hidden="true"
    >
      <polyline points="0,7 34,7 42,2 52,12 62,3 72,11 82,5 90,9 98,7 160,7" />
    </svg>
  );
}

type ObservatoryViewProps = {
  divergence: DivergenceState;
  ratingDistributions: RatingDistributionsState;
  positionBias: PositionBiasState;
  session: SessionMarker | null;
  /** romaji → verbatim kana from the live record; threaded to scatter + radar. */
  kanaByRomaji: ReadonlyMap<string, string>;
  onBackToHome: () => void;
};

export function ObservatoryView({
  divergence,
  ratingDistributions,
  positionBias,
  session,
  kanaByRomaji,
  onBackToHome,
}: ObservatoryViewProps) {
  const liveRows = divergence.status === "ready" ? divergence.rows : null;
  const totals = recordTotals(liveRows ?? []);

  return (
    <section className="observatory">
      <header className="observatory-header">
        <SpecimenLabel pill>Record · All players</SpecimenLabel>
        <h1>The Observatory</h1>
        <WaveRule />
        <p className="observatory-register">
          Every guess and rating in the arena, aggregated live.
        </p>
        <dl className="observatory-counts">
          <div className="observatory-count">
            <dt className="specimen-label">Guesses</dt>
            <dd>{liveRows === null ? "—" : formatCount(totals.guesses)}</dd>
          </div>
          <div className="observatory-count">
            <dt className="specimen-label">Ratings</dt>
            <dd>{liveRows === null ? "—" : formatCount(totals.ratings)}</dd>
          </div>
        </dl>
        {divergence.status === "loading" ? (
          <p className="observatory-status">Opening the record…</p>
        ) : null}
        {divergence.status === "error" ? (
          <p className="observatory-status">
            The live record is unreachable right now. The reference layers
            below still stand.
          </p>
        ) : null}
        {divergence.status === "ready" &&
        totals.guesses === 0 &&
        totals.ratings === 0 ? (
          <p className="observatory-status">
            The record opens with the first guess.
          </p>
        ) : null}
        <Button variant="secondary" size="sm" type="button" onClick={onBackToHome}>
          Back to modes
        </Button>
      </header>

      <ModalityDumbbell liveRows={liveRows} />
      <DivergenceScatter
        liveRows={liveRows}
        session={session}
        kanaByRomaji={kanaByRomaji}
      />
      <WordRadar kanaByRomaji={kanaByRomaji} />
      <RatingRainclouds distributions={ratingDistributions} />
      <IntegrityStrip positionBias={positionBias} />

      {/* Coming-soon slots, §2.3 honest pattern: full-opacity copy naming what
          will be measured and what gates it. No locks, no mystery. */}
      <section className="observatory-coming">
        <article className="observatory-coming-slot">
          <SpecimenLabel pill>Coming soon</SpecimenLabel>
          <h2>The semantic network</h2>
          <p>
            Which words sound alike, which meanings sit close, and where
            players' confusions trace edges between them. Populates once the
            record links each word to its web of meanings.
          </p>
        </article>
        <article className="observatory-coming-slot">
          <SpecimenLabel pill>Coming soon</SpecimenLabel>
          <h2>The confusion matrix</h2>
          <p>
            Which wrong word gets picked, for which target. Builds as trials
            per pairing accumulate in the record.
          </p>
        </article>
      </section>

      <footer className="observatory-footnotes">
        <p>
          Sources: Paulsson (2025),{" "}
          <em>
            Unimodal and Cross-Modal Iconicity in Japanese Ideophones: A
            Cognitive-Semiotic Approach
          </em>{" "}
          — the MA thesis this arena replicates (30 pairs, 36 participants).
          McLean, Dunn &amp; Dingemanse (2023),{" "}
          <em>Two measures are better than one</em> — the 304-item backdrop,
          data CC BY 4.0. Iida &amp; Akita (2023), perceptual strength norms
          for 510 Japanese words.
        </p>
      </footer>
    </section>
  );
}

type ObservatoryProps = {
  /** Session accuracy 0–1 when arriving via the completion link, else null. */
  sessionAccuracy: number | null;
  onBackToHome: () => void;
};

export default function Observatory({
  sessionAccuracy,
  onBackToHome,
}: ObservatoryProps) {
  const [divergence, setDivergence] = useState<DivergenceState>({
    status: "loading",
  });
  const [ratingDistributions, setRatingDistributions] =
    useState<RatingDistributionsState>({ status: "loading" });
  const [positionBias, setPositionBias] = useState<PositionBiasState>({
    status: "loading",
  });
  const [ratingMean, setRatingMean] = useState<number | null>(null);

  // Three independent public aggregates: each panel degrades on its own so one
  // unreachable endpoint never blanks the others.
  useEffect(() => {
    let cancelled = false;
    getDivergence()
      .then((rows) => {
        if (!cancelled) setDivergence({ status: "ready", rows });
      })
      .catch(() => {
        if (!cancelled) setDivergence({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getRatingDistributions()
      .then((data) => {
        if (!cancelled) setRatingDistributions({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setRatingDistributions({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPositionBias()
      .then((data) => {
        if (!cancelled) setPositionBias({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setPositionBias({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionAccuracy === null) return;
    let cancelled = false;
    getAllMyRatings()
      .then((ratings) => {
        if (!cancelled) setRatingMean(playerMeanRating(ratings));
      })
      .catch(() => {
        // Honest degrade: the crosshair renders its x-line only.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionAccuracy]);

  const session: SessionMarker | null =
    sessionAccuracy === null
      ? null
      : { accuracy: sessionAccuracy, meanRating: ratingMean };

  // romaji → verbatim kana from whatever the live record already carries; the
  // scatter and radar wear kana on a word once it has entered the record
  // (invariant 1: rendered as stored, never derived).
  const kanaByRomaji = useMemo(() => {
    const map = new Map<string, string>();
    if (divergence.status === "ready") {
      for (const row of divergence.rows) {
        if (row.romaji && row.displayForm) map.set(row.romaji, row.displayForm);
      }
    }
    return map;
  }, [divergence]);

  return (
    <ObservatoryView
      divergence={divergence}
      ratingDistributions={ratingDistributions}
      positionBias={positionBias}
      session={session}
      kanaByRomaji={kanaByRomaji}
      onBackToHome={onBackToHome}
    />
  );
}
