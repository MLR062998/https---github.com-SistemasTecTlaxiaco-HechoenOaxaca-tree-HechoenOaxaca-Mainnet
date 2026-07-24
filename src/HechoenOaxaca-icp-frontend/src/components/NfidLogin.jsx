import React from "react";
import { useAuthContext } from "./authContext";

function NfidLogin() {
  const { connect, logout, isAuthenticated, principalId, isLoading, authState } = useAuthContext();

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={isAuthenticated ? logout : connect}
        style={{ 
          padding: "12px 24px", 
          fontSize: "16px",
          backgroundColor: isAuthenticated ? "#dc3545" : "#0d6efd",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1
        }}
        disabled={isLoading}
      >
        {isLoading ? "⏳ Cargando..." : 
         isAuthenticated ? "🚪 Cerrar sesión NFID" : 
         "🔐 Iniciar sesión con NFID"}
      </button>
      
      {principalId && (
        <div style={{ marginTop: "15px", padding: "10px", background: "#f8f9fa", borderRadius: "5px" }}>
          <p style={{ margin: "0", fontSize: "14px", wordBreak: "break-all" }}>
            <strong>🆔 ID:</strong> {principalId}
          </p>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
            <strong>🔐 Estado:</strong> {authState.status}
          </p>
          {authState.error && (
            <p style={{ margin: "5px 0 0 0", color: "red", fontSize: "14px" }}>
              <strong>❌ Error:</strong> {authState.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default NfidLogin;