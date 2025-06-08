import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import LoadingScreen from "./components/LoadingScreen";
import Menu from "./components/Menu";
import ProtectedRoute from "./components/ProtectedRoute";
import DebugStatus from "./components/DebugStatus";
import { AuthStateListener } from "./components/AuthStateListener";

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
import CheckoutConfirmado from "./components/CheckoutConfirmado";
import LoginSuccess from "./pages/LoginSuccess";

function AppContent() {
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
        <Route path="/Artesano-dashboard" element={
          <ProtectedRoute requiredRoles={["Artesano"]}>
            <Artesano />
          </ProtectedRoute>
        } />
        <Route path="/cliente-dashboard" element={
          <ProtectedRoute requiredRoles={["Cliente"]}>
            <ClienteDashboard />
          </ProtectedRoute>
        } />
        <Route path="/intermediario-dashboard" element={
          <ProtectedRoute requiredRoles={["Intermediario"]}>
            <IntermediarioDashboard />
          </ProtectedRoute>
        } />
        <Route path="/notificaciones-cliente" element={
          <ProtectedRoute>
            <NotificacionesCliente />
          </ProtectedRoute>
        } />
        <Route path="/carrito" element={
          <ProtectedRoute>
            <CarritoDeCliente />
          </ProtectedRoute>
        } />
        <Route path="/checkout-confirmado" element={
          <ProtectedRoute>
            <CheckoutConfirmado />
          </ProtectedRoute>
        } />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="*" element={
          <div className="container py-5 text-center">
            <h2>Página no encontrada</h2>
          </div>
        } />
      </Routes>
      {import.meta.env.DEV && <DebugStatus />}
    </>
  );
}

export default function App() {
  return (
    <>
      <AuthStateListener />
      <Suspense fallback={<LoadingScreen message="Cargando aplicación..." />}>
        <AppContent />
      </Suspense>
    </>
  );
}
