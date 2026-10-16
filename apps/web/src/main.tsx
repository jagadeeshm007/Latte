import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import { applyTheme, readTheme } from "@/lib/theme";

import "@/index.css";

// Mount only. Providers live in App, routes in app/routes.tsx.
const container = document.getElementById("root");
if (!container) {
  throw new Error("index.html has no #root element");
}

applyTheme(readTheme());

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
