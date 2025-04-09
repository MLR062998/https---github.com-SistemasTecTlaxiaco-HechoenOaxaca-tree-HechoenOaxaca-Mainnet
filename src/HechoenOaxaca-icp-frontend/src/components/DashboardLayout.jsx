// src/components/DashboardLayout.jsx
import React from "react";
import { useWalletInfo } from "./useWalletInfo";
import { ConnectButton } from "@connect2ic/react";
import { Link } from "react-router-dom";

const DashboardLayout = ({ title, children }) => {
  const { rol, saldo, principal, loading } = useWalletInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {!loading && (
            <p className="text-sm text-gray-600">
              Rol: <strong>{rol}</strong> | Saldo: <strong>{saldo} ICP</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConnectButton />
          <span className="text-xs text-gray-400">{principal?.slice(0, 8)}...</span>
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
