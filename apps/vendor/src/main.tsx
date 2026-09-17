import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { Providers } from "./providers";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/vendor">
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>,
);
