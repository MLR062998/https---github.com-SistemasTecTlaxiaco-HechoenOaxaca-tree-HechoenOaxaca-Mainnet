// src/App.jsx
import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthContext } from "./components/authContext";

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
import CheckoutConfirmado from "./components/CheckoutConfirmado"; // ✅ nuevo

function AuthRedirector() {
  const { isAuthenticated, principalId, actor } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    const verificarUsuario = async () => {
      if (!isAuthenticated || !principalId || !actor) return;
      try {
        const nombre = await actor.quienSoy();
        console.log("🔐 quienSoy():", nombre);
      } catch (err) {
        console.error("❌ Error al llamar quienSoy():", err);
      }
    };

    verificarUsuario();
  }, [isAuthenticated, principalId, actor]);

  return null;
}

function AppContent() {
  return (
    <>
      <Menu />
      <AuthRedirector />
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
        <Route path="/checkout-confirmado" element={<CheckoutConfirmado />} /> {/* ✅ nuevo */}
        <Route path="*" element={<div className="container py-5 text-center"><h2>Página no encontrada</h2></div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingScreen message="Cargando aplicación..." />}>
        <AppContent />
      </Suspense>
    </Router>
  );
}
