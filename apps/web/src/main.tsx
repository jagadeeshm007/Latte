import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";

import "@/index.css";

// Mount only. Providers live in App, routes in app/routes.tsx.
const container = document.getElementById("root");
if (!container) {
  throw new Error("index.html has no #root element");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
