import React from "react";
import { useAuthContext } from "./authContext";

const AuthButton = () => {
  const { isAuthenticated, login, logout, principalId, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-blue-500 text-white rounded animate-pulse"
      >
        Conectando...
      </button>
    );
  }

  return isAuthenticated ? (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{principalId?.slice(0, 8)}...</span>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
      >
        Cerrar sesión
      </button>
    </div>
  ) : (
    <button
      onClick={login}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
    >
      Iniciar sesión
    </button>
  );
};

export default AuthButton;
