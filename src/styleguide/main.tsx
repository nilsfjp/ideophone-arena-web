// DEV-ONLY entry for /styleguide.html (Checkpoint 1 of the design-token pass).
// Loads every candidate face so the pairings can be compared side by side;
// the player app will import only the chosen pairing.
import React from "react";
import ReactDOM from "react-dom/client";

import "@fontsource/line-seed-jp/latin-400.css";
import "@fontsource/line-seed-jp/latin-700.css";
import "@fontsource/line-seed-jp/japanese-400.css";
import "@fontsource/line-seed-jp/japanese-700.css";
import "@fontsource/zen-maru-gothic/latin-400.css";
import "@fontsource/zen-maru-gothic/latin-700.css";
import "@fontsource/zen-maru-gothic/japanese-400.css";
import "@fontsource/zen-maru-gothic/japanese-700.css";
import "@fontsource/zen-kaku-gothic-new/latin-400.css";
import "@fontsource/zen-kaku-gothic-new/latin-700.css";
import "@fontsource/zen-kaku-gothic-new/japanese-400.css";
import "@fontsource/zen-kaku-gothic-new/japanese-700.css";

import "../styles/tokens.css";
import "../styles/styleguide.css";
import StyleGuide from "./StyleGuide";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StyleGuide />
  </React.StrictMode>,
);
