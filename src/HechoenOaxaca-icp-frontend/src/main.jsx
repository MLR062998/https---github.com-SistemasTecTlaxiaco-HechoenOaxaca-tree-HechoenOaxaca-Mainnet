// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.scss";

import { Buffer } from "buffer";
window.Buffer = Buffer;

import { AuthProvider } from "./components/authContext";
import { BrowserRouter } from "react-router-dom";
import { setupGlobalErrorHandling } from "./utils/global-error-handler"; // ✅ Corregido el nombre

// Configurar manejo global de errores
setupGlobalErrorHandling();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);