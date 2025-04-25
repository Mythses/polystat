import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import StatsViewer from "./StatsViewer.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StatsViewer />
  </StrictMode>
);
