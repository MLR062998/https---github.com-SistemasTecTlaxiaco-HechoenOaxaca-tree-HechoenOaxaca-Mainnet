// src/components/Artesano.jsx
import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import CrearProducto from "./CrearProducto";
import Products from "./Products";

const Artesano = () => {
  return (
    <div className="artesano-dashboard min-h-screen bg-gray-50 px-4 py-6">
      <header className="dashboard-header text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Bienvenido, Artesano</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tus productos, añade nuevos a tu inventario, y más.
        </p>
      </header>

      {/* Opciones principales */}
      <div className="artesano-options flex justify-center gap-4 mb-8">
        <Link
          to="/nuevo-producto"
          className="btn btn-primary px-4 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
        >
          Crear Producto
        </Link>
        <Link
          to="/mis-productos"
          className="btn btn-secondary px-4 py-2 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition duration-300"
        >
          Mis Productos
        </Link>
        <Link
          to="/wallet"
          className="btn btn-wallet px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg shadow-md hover:bg-yellow-600 transition duration-300"
        >
          Wallet
        </Link>
        <Link
          to="/notificaciones"
          className="btn btn-notifications px-4 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition duration-300"
        >
          Notificaciones
        </Link>
      </div>

      {/* Configuración de rutas */}
      <div className="artesano-routes container mx-auto">
        <Routes>
          <Route path="/nuevo-producto" element={<CrearProducto />} />
          <Route path="/mis-productos" element={<Products />} />
          <Route path="/wallet" element={<div>Wallet en construcción</div>} />
          <Route path="/notificaciones" element={<div>Notificaciones en construcción</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default Artesano;
