// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Buffer } from "buffer";

import App from "./App";
import "./index.scss";

import { AuthProvider } from "./components/authContext";

import { setupGlobalErrorHandling } from "./utils/globalThis-error-handler";

// Polyfill Buffer para ICP
window.Buffer = Buffer;

// Configurar manejo global de errores
setupGlobalErrorHandling();

const root = ReactDOM.createRoot(
  document.getElementById("root")
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);