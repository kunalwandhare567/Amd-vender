import './i18n';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

import { SocketProvider } from "./contexts/SocketContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SocketProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SocketProvider>
  </StrictMode>
);
