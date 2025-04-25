// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Connect2ICProvider } from "@connect2ic/react";
import { createClient } from "@connect2ic/core";
import * as Productos_backend from "declarations/HechoenOaxaca-icp-backend";
import { useAuthFlow } from "./components/auth";

import Menu from "./components/Menu";
import CrearProducto from "./components/CrearProducto";
import Products from "./components/Products";
import Home from "./components/Home";
import Compra from "./components/Compra";
import Registro from "./components/Registro";
import Wallet from "./components/Wallet";
import Artesano from "./components/Artesano";
import ClienteDashboard from "./components/Cliente";
import IntermediarioDashboard from "./components/Intermediario";
import NotificacionesCliente from "./components/NotificacionesCliente";
import CarritoDeCliente from "./components/CarritoDeCliente";

// ⚠️ NO declares wallets manualmente en esta versión
const client = createClient({
  canisters: {
    "HechoenOaxaca-icp-backend": Productos_backend,
  },
  globalProviderConfig: {
    dev: true,
  },
});

function AppContent() {
  useAuthFlow();

  return (
    <>
      <Menu />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nuevo-producto/*" element={<CrearProducto />} />
        <Route path="/products/*" element={<Products />} />
        <Route path="/compra" element={<Compra />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/wallet/*" element={<Wallet />} />
        <Route path="/Artesano-dashboard" element={<Artesano />} />
        <Route path="/cliente-dashboard" element={<ClienteDashboard />} />
        <Route path="/intermediario-dashboard" element={<IntermediarioDashboard />} />
        <Route path="/notificaciones-cliente" element={<NotificacionesCliente />} />
        <Route path="/carrito" element={<CarritoDeCliente />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Connect2ICProvider client={client}>
      <Router>
        <AppContent />
      </Router>
    </Connect2ICProvider>
  );
}

export default App;
