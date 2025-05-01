import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Home from "./components/Home";
import Leaderboard from "./components/Leaderboard";
import User from "./components/User";
import Utils from "./components/Utils";
import "./index.css";

// Create the browser router instance
const router = createBrowserRouter([
    {
        // Route for the root path "/"
        path: "/",
        Component: Home,
        index: true // This ensures it matches exactly "/"
    },
    {
        // This route acts as a parent for paths starting with "/polystats".
        // We will use an index route within its children to handle the
        // base "/polystats" and "/polystats/" paths.
        path: "/polystats",
        children: [
            {
                // This index route matches the parent path exactly ("/polystats" and "/polystats/")
                // and renders the Home component as requested.
                index: true,
                Component: Home
            },
            {
                // This route matches "/polystats/leaderboard"
                path: "leaderboard",
                Component: Leaderboard
            },
            {
                // This route matches "/polystats/user"
                path: "user",
                Component: User
            },
            {
                // This route matches "/polystats/utils"
                path: "utils",
                Component: Utils
            },
        ]
    }
]);

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  // Render the application
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
