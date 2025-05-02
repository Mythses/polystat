import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Import HashRouter, Routes, and Route
import {
  HashRouter as Router, // Alias HashRouter as Router for common usage
  Routes,
  Route,
} from "react-router-dom";

// Assuming your components are imported like this
import Home from "./components/Home";
import Leaderboard from "./components/Leaderboard";
import User from "./components/User";
import Utils from "./components/Utils";

import "./index.css";

// Remove the createBrowserRouter definition
// const router = createBrowserRouter([...]);

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  // Render the application using HashRouter
  root.render(
    <StrictMode>
      {/* Use HashRouter instead of RouterProvider */}
      {/* The basename prop is crucial for subdirectory deployments like /polystats/ */}
      <Router basename="/polystats">
        <Routes>
          {/* Define your routes using the path relative to the basename */}
          {/* The root path "/" relative to "/polystats" is "/polystats/" or "/polystats" */}
          <Route path="/" element={<Home />} />

          {/* This route matches "/polystats/#/leaderboard" */}
          <Route path="/leaderboard" element={<Leaderboard />} />

          {/* This route matches "/polystats/#/user" */}
          <Route path="/user" element={<User />} />

          {/* This route matches "/polystats/#/utils" */}
          <Route path="/utils" element={<Utils />} />

          {/* Add more routes as needed */}
        </Routes>
      </Router>
    </StrictMode>
  );
}
