import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ArenaPage from "./pages/ArenaPage";
import ResultsPage from "./pages/ResultsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="site-title">
          Ideophone Arena
        </Link>

        <nav className="site-nav">
          <Link to="/arena">Arena</Link>
          <Link to="/results">Results</Link>
        </nav>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
