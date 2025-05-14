// src/components/authContext.jsx

import React, { createContext, useContext } from "react";
import { useConnect } from "@connect2ic/react"; // Hook que gestiona la conexión del usuario

const AuthContext = createContext();

// Hook personalizado para consumir el contexto de autenticación
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  // Hook principal para autenticación proporcionado por connect2ic
  const {
    isConnected,        // indica si el usuario está autenticado
    principal,          // ID del usuario autenticado
    connect,            // función para iniciar sesión
    disconnect,         // función para cerrar sesión
    activeProvider,     // proveedor activo de autenticación (ej. Plug, Internet Identity)
    isConnecting,       // indica si está en proceso de conexión
    isInitialized,      // indica si ya se ha inicializado el sistema de conexión
  } = useConnect();

  // Estructura del contexto que será accesible en toda la app
  const value = {
    isAuthenticated: isConnected,     // estado de autenticación
    principalId: principal,           // ID del usuario
    isLoading: isConnecting || !isInitialized,  // estado de carga
    connect,                          // método para conectar
    disconnect,                       // método para desconectar
    activeProvider,                   // proveedor activo
  };

  return (
    <AuthContext.Provider value={value}>
      {value.isLoading ? (
        <div style={{ padding: "2rem", color: "red", fontFamily: "sans-serif" }}>
          <h3>⚠️ Cargando... ¿se ha quedado aquí?</h3>
          <p>Verifica la consola del navegador o recarga la página.</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export { AuthContext };
