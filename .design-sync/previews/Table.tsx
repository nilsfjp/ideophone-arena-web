// Authored preview - the real shadcn Table family from window.IdeophoneArena.
// This is the leaderboard / lab-record chrome: a hairline-ruled table that
// wraps itself in an overflow-x container so wide content scrolls in its own
// box and the page never scrolls sideways (§9.1).
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "ideophone-arena-web";

const rows = [
  { rank: 1, player: "kirakira_fan", correct: 47, total: 50 },
  { rank: 2, player: "sound_symbolist", correct: 44, total: 50 },
  { rank: 3, player: "fuwafuwa", correct: 41, total: 50 },
  { rank: 4, player: "gorogoro", correct: 38, total: 50 },
];

// A populated leaderboard table with a caption and four ranked rows.
export const Leaderboard = () => (
  <div style={{ padding: "var(--space-4)", maxWidth: 520 }}>
    <Table>
      <TableCaption>Best completed session per player</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Correct</TableHead>
          <TableHead>Accuracy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.rank}>
            <TableCell>{r.rank}</TableCell>
            <TableCell>{r.player}</TableCell>
            <TableCell>
              {r.correct}/{r.total}
            </TableCell>
            <TableCell>{Math.round((r.correct / r.total) * 100)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
