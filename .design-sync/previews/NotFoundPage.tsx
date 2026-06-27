// Authored preview — the 404 page. It renders a react-router <Link>, so the
// preview wraps it in a MemoryRouter (the only render that's valid outside the
// app's own router).
// MemoryRouter comes from the bundle (via cfg.extraEntries), NOT a fresh
// react-router-dom copy — otherwise NotFoundPage's <Link> reads a different,
// null router context.
import { NotFoundPage, MemoryRouter } from "ideophone-arena-web";

export const Default = () => (
  <MemoryRouter>
    <NotFoundPage />
  </MemoryRouter>
);
