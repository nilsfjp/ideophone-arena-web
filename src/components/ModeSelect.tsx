import type { ModeDefinition, ModeId } from "../modes";

type ModeSelectProps = {
  modes: ModeDefinition[];
  onSelect: (id: ModeId) => void;
};

// The six-mode home shell (§2.3): cards render from modes.ts data only, so the
// auto-fill grid scales 3->6 without a code change. Each card carries a
// measure chip (specimen label), title, one-line description, and a status
// slot reserved even when empty. Cards stay <button class="mode-card"> - the
// interactive root the proof battery pins and the browser loop drives.
export default function ModeSelect({ modes, onSelect }: ModeSelectProps) {
  return (
    <section className="mode-select" aria-labelledby="mode-select-title">
      <h1 id="mode-select-title">Choose a mode</h1>
      <p>Pick how you want to explore ideophones today.</p>

      <div className="mode-list">
        {modes.map((mode) => {
          const comingSoon = mode.status !== "available";

          return (
            <button
              aria-disabled={comingSoon || undefined}
              className={comingSoon ? "mode-card mode-card-disabled" : "mode-card"}
              disabled={comingSoon}
              key={mode.id}
              type="button"
              onClick={() => onSelect(mode.id)}
            >
              <span className="mode-card-measure">{mode.measure}</span>
              <span className="mode-card-title">{mode.title}</span>
              <span className="mode-card-copy">{mode.description}</span>
              {/* Reserved status slot (§2.3): empty on available cards, pill on
                  coming-soon. :empty keeps the rhythm without drawing a pill. */}
              <span className="mode-card-status">
                {comingSoon ? "Coming soon" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
