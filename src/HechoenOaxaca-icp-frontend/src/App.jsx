import React from "react";

import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Menu from "./components/Menu";

import ProtectedRoute from "./components/ProtectedRoute";

import DebugStatus from "./components/DebugStatus";

// =====================================================
// Pages / Components
// =====================================================

import Home from "./components/Home";

import Registro from "./components/Registro";

import Compra from "./components/Compra";

import ProductoDetalle from "./components/ProductoDetalle";

import VerificarProducto from "./components/VerificarProducto"; // ✅ NUEVO

import CrearProducto from "./components/CrearProducto";

import Products from "./components/Products";

import Artesano from "./components/Artesano";

import ClienteDashboard from "./components/Cliente";

import IntermediarioDashboard from "./components/Intermediario";

import NotificacionesCliente from "./components/NotificacionesCliente";

import CarritoDeCliente from "./components/CarritoDeCliente";

import CheckoutConfirmado from "./components/CheckoutConfirmado";

import LoginSuccess from "./pages/LoginSuccess";

// =====================================================
// Context
// =====================================================

import { CarritoProvider } from "./context/CarritoContext";

// =====================================================
// App Content
// =====================================================

function AppContent() {
  return (
    <>
      <Menu />

      <Routes>
        {/* ===================================================== */}
        {/* Públicas */}
        {/* ===================================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/registro"
          element={<Registro />}
        />

        <Route
          path="/login-success"
          element={<LoginSuccess />}
        />

        <Route
          path="/compra"
          element={<Compra />}
        />

        <Route
          path="/producto/:id"
          element={<ProductoDetalle />}
        />

        {/* ✅ NUEVA RUTA: Verificación pública de autenticidad */}
        <Route
          path="/verificar/:id"
          element={<VerificarProducto />}
        />

        {/* ===================================================== */}
        {/* Artesano */}
        {/* ===================================================== */}

        <Route
          path="/artesano-dashboard/*"
          element={
            <ProtectedRoute
              requiredRoles={[
                "Artesano",
              ]}
            >
              <Artesano />
            </ProtectedRoute>
          }
        />

        {/* Redirige /mis-productos a la ruta anidada correcta */}
        <Route
          path="/mis-productos"
          element={
            <Navigate
              to="/artesano-dashboard/mis-productos"
              replace
            />
          }
        />

        {/* ===================================================== */}
        {/* Cliente */}
        {/* ===================================================== */}

        <Route
          path="/cliente-dashboard/*"
          element={
            <ProtectedRoute
              requiredRoles={[
                "Cliente",
              ]}
            >
              <ClienteDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/carrito"
          element={
            <ProtectedRoute>
              <CarritoDeCliente />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout-confirmado"
          element={
            <ProtectedRoute>
              <CheckoutConfirmado />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notificaciones-cliente"
          element={
            <ProtectedRoute>
              <NotificacionesCliente />
            </ProtectedRoute>
          }
        />

        {/* ===================================================== */}
        {/* Intermediario */}
        {/* ===================================================== */}

        <Route
          path="/intermediario-dashboard/*"
          element={
            <ProtectedRoute
              requiredRoles={[
                "Intermediario",
              ]}
            >
              <IntermediarioDashboard />
            </ProtectedRoute>
          }
        />

        {/* ===================================================== */}
        {/* Productos (público, sin autenticación) */}
        {/* ===================================================== */}

        <Route
          path="/products/*"
          element={<Products />}
        />

        {/* ===================================================== */}
        {/* 404 */}
        {/* ===================================================== */}

        <Route
          path="*"
          element={
            <div className="container py-5 text-center">
              <h2>
                Página no encontrada
              </h2>

              <p>
                La URL solicitada no existe.
              </p>
            </div>
          }
        />
      </Routes>

      {/* ===================================================== */}
      {/* Debug */}
      {/* ===================================================== */}

      {import.meta.env.DEV && (
        <DebugStatus />
      )}
    </>
  );
}

// =====================================================
// App
// =====================================================

export default function App() {
  return (
    <CarritoProvider>
      <AppContent />
    </CarritoProvider>
  );
}