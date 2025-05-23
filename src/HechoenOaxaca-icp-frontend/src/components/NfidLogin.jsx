import React from "react";
import { useAuthContext } from "./authContext";

function NfidLogin() {
  const { connect, disconnect, isAuthenticated, principalId, isLoading } = useAuthContext();

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={isAuthenticated ? disconnect : connect}
        style={{ padding: "10px 20px", fontSize: "16px" }}
        disabled={isLoading}
      >
        {isLoading ? "Cargando..." : isAuthenticated ? "Cerrar sesión" : "🚀 Iniciar sesión con NFID"}
      </button>
      {principalId && <p style={{ marginTop: "10px" }}>🆔 {principalId}</p>}
    </div>
  );
}

export default NfidLogin;
