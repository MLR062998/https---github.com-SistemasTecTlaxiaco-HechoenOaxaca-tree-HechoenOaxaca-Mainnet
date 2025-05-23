// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.scss";

import { Buffer } from "buffer";
window.Buffer = Buffer;

import { createClient } from "@connect2ic/core";
import { Connect2ICProvider } from "@connect2ic/react";
import { NFID } from "@connect2ic/core/providers/nfid";

// ✅ Usa ruta relativa correcta al backend generado
import * as HechoenOaxaca from "../../declarations/HechoenOaxaca-icp-backend";

// ✅ Contexto de autenticación
import { AuthProvider } from "./components/authContext";

const client = createClient({
  canisters: {
    HechoenOaxaca,
  },
  providers: [
    new NFID({
      appName: "Hecho en Oaxaca",
    }),
  ],
  globalProviderConfig: {
    host: import.meta.env.DEV ? "http://127.0.0.1:4943" : "https://icp0.io",
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Connect2ICProvider client={client}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Connect2ICProvider>
  </React.StrictMode>
);
