type TrialOption = {
  id: number;
  text: string;
  script: "hiragana" | "katakana";
};

type Trial = {
  id: number;
  prompt: string;
  left: TrialOption;
  right: TrialOption;
};

const mockTrial: Trial = {
  id: 1,
  prompt: "Which word better matches a rough, rattling sensation?",
  left: {
    id: 101,
    text: "ごろごろ",
    script: "hiragana",
  },
  right: {
    id: 102,
    text: "ゴツゴツ",
    script: "katakana",
  },
};

export default function ArenaPage() {
  return (
    <section>
      <h1>Arena</h1>

      <p>{mockTrial.prompt}</p>

      <div className="choice-grid">
        <button type="button" className="choice-card">
          <span className="choice-text">{mockTrial.left.text}</span>
          <span className="choice-meta">{mockTrial.left.script}</span>
        </button>

        <button type="button" className="choice-card">
          <span className="choice-text">{mockTrial.right.text}</span>
          <span className="choice-meta">{mockTrial.right.script}</span>
        </button>
      </div>
    </section>
  );
}
