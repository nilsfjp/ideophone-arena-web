// Merged onto window.IdeophoneArena via cfg.extraEntries so preview cards can
// wrap router-coupled components (e.g. NotFoundPage's <Link>) in a MemoryRouter
// that shares the SAME react-router-dom instance the bundle inlines. Importing
// MemoryRouter from a separate react-router-dom copy yields a null router
// context ("Cannot destructure property 'basename'") because the contexts differ.
export { MemoryRouter } from "react-router-dom";
