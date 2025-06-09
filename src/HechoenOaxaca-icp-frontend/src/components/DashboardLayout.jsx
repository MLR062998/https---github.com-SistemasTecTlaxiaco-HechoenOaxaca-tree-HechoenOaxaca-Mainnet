// src/components/DashboardLayout.jsx
import React from "react";
import { useWalletInfo } from "./useWalletInfo";
import AuthButton from "./AuthButton";
import { Link } from "react-router-dom";

const DashboardLayout = ({ title, children }) => {
  const { rol, saldo, principal, loading } = useWalletInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {loading ? (
            <div className="text-sm text-gray-500 animate-pulse">🔄 Cargando información de wallet...</div>
          ) : rol ? (
            <p className="text-sm text-gray-600">
              Rol: <strong>{rol}</strong> | Saldo: <strong>{saldo} ICP</strong>
            </p>
          ) : (
            <p className="text-sm text-red-500">⚠️ Rol no asignado. Contacta soporte.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AuthButton />
        </div>
      </header>

      <nav className="bg-indigo-100 text-indigo-900 p-3 flex gap-4">
        <Link to="/nuevo-producto">🛠 Crear Producto</Link>
        <Link to="/mis-productos">📦 Mis Productos</Link>
        <Link to="/wallet">💰 Wallet</Link>
        <Link to="/notificaciones">🔔 Notificaciones</Link>
        <Link to="/">🏠 Volver a Inicio</Link>
      </nav>

      <main className="p-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
