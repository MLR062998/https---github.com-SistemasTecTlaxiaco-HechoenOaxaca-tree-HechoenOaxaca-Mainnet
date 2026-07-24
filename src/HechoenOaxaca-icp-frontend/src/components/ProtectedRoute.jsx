
import React from "react";

import { Navigate } from "react-router-dom";

import { useAuthContext } from "./authContext";

import VerificandoUsuario from "./VerificandoUsuario";

// =====================================================
// Protected Route
// =====================================================

export default function ProtectedRoute({
  children,
  requiredRoles = [],
}) {
  const {
    authState,
    rol,
    isLoading,
  } = useAuthContext();

  // =====================================================
  // Loading inicial
  // =====================================================

  if (
    isLoading ||
    authState.status ===
      "initializing" ||
    authState.status ===
      "authenticating"
  ) {
    return <VerificandoUsuario />;
  }

  // =====================================================
  // Error de autenticación
  // =====================================================

  if (authState.status === "error") {
    return (
      <div className="container py-5 text-center">
        <h2>
          Error de autenticación
        </h2>

        <p>
          {
            authState.error ||
            "No fue posible verificar la sesión."
          }
        </p>
      </div>
    );
  }

  // =====================================================
  // Usuario NO autenticado
  // =====================================================

  if (
    authState.status !==
    "authenticated"
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // =====================================================
  // Validación de roles
  // =====================================================

  if (
    requiredRoles.length > 0 &&
    !requiredRoles.includes(rol)
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // =====================================================
  // Render children
  // =====================================================

  return <>{children}</>;
}
