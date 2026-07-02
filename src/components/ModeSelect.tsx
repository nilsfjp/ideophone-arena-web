import type { ModeDefinition, ModeId } from "../modes";

type ModeSelectProps = {
  modes: ModeDefinition[];
  onSelect: (id: ModeId) => void;
};

export default function ModeSelect({ modes, onSelect }: ModeSelectProps) {
  return (
    <section className="mode-select" aria-labelledby="mode-select-title">
      <h1 id="mode-select-title">Choose a mode</h1>
      <p>Pick how you want to explore Japanese ideophones today.</p>

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
              <span className="mode-card-title">{mode.title}</span>
              <span className="mode-card-copy">{mode.description}</span>
              {comingSoon ? (
                <span className="mode-card-status">Coming soon</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
