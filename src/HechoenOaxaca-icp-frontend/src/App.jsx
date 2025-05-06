import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Connect2ICProvider, useConnect } from "@connect2ic/react";
import { createClient } from "@connect2ic/core";
import { InternetIdentity } from "@connect2ic/core/providers/internet-identity";
import * as Productos_backend from "declarations/HechoenOaxaca-icp-backend";

// Componentes
import LoadingScreen from "./components/LoadingScreen";
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

// Configuración del cliente para producción
const client = createClient({
  canisters: {
    "HechoenOaxaca-icp-backend": Productos_backend,
  },
  providers: [
    new InternetIdentity({
      providerUrl: "https://identity.ic0.app",
    }),
  ],
  globalProviderConfig: {
    dev: false,
    host: "https://icp0.io",
  },
});

function AppContent() {
  const { isInitializing, isConnected } = useConnect();

  if (isInitializing) {
    return <LoadingScreen message="Conectando con Internet Computer..." />;
  }

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
        {/* Ruta de fallback para manejar 404 */}
        <Route path="*" element={<div className="container py-5 text-center"><h2>Página no encontrada</h2></div>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Connect2ICProvider client={client}>
      <Router basename="/">
        <Suspense fallback={<LoadingScreen message="Cargando aplicación..." />}>
          <AppContent />
        </Suspense>
      </Router>
    </Connect2ICProvider>
  );
}

export default App;