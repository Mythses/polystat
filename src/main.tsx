import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import StatsViewer from "./StatsViewer";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StatsViewer />
  </StrictMode>
);
