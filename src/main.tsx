import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Self-hosted identity faces (OFL 1.1, woff2 unicode-range subsets):
// LINE Seed JP = body (400) and stimulus kana (Bold 700), Zen Maru Gothic =
// display headings. System Japanese faces cover the body fallback (D2, NIL-42).
import "@fontsource/line-seed-jp/latin-400.css";
import "@fontsource/line-seed-jp/latin-700.css";
import "@fontsource/line-seed-jp/japanese-400.css";
import "@fontsource/line-seed-jp/japanese-700.css";
import "@fontsource/zen-maru-gothic/latin-400.css";
import "@fontsource/zen-maru-gothic/latin-700.css";
import "@fontsource/zen-maru-gothic/japanese-400.css";
import "@fontsource/zen-maru-gothic/japanese-700.css";

import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
