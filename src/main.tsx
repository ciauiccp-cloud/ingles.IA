import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";

// VITE_HASH_ROUTER=1 gera uma versão de prévia que funciona em qualquer endereço (sem reescrita de rotas).
const Router = import.meta.env.VITE_HASH_ROUTER === "1" ? HashRouter : BrowserRouter;
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./components/ui";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </Router>
  </React.StrictMode>
);
