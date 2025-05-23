// src/components/authContext.jsx
import React, { createContext, useContext, useMemo } from "react";
import { useConnect } from "@connect2ic/react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const {
    isConnected,
    principal,
    connect,
    disconnect,
    activeProvider,
  } = useConnect();

  const principalStr = useMemo(() => {
    if (!principal) return null;
    return typeof principal.toText === "function" ? principal.toText() : String(principal);
  }, [principal]);

  const value = useMemo(() => ({
    isAuthenticated: isConnected,
    principalId: principalStr,
    connect,
    disconnect,
    activeProvider,
  }), [isConnected, principalStr, connect, disconnect, activeProvider]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  return context;
};
