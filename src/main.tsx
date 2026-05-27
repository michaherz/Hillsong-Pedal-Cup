import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LangProvider } from "./lib/i18n";
import LanguageToggle from "./components/LanguageToggle";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <BrowserRouter>
        <LanguageToggle />
        <App />
      </BrowserRouter>
    </LangProvider>
  </StrictMode>,
);
