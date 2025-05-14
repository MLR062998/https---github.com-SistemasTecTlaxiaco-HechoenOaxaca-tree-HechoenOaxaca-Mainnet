// src/components/NfidLogin.jsx
import { useConnect } from "@connect2ic/react";
import React, { useEffect } from "react";

function NfidLogin() {
  const { isConnected, isConnecting, principal, connect, error } = useConnect();

  useEffect(() => {
    if (isConnected && principal) {
      console.log("✅ Usuario conectado:", principal);
      localStorage.setItem("principalId", principal);
    }
  }, [isConnected, principal]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={connect}
        style={{ padding: "10px 20px", fontSize: "16px" }}
        disabled={isConnecting}
      >
        {isConnecting ? "Conectando..." : "🚀 Iniciar sesión con NFID"}
      </button>
      {error && <p style={{ color: "red", marginTop: "10px" }}>❌ {error.message}</p>}
    </div>
  );
}

export default NfidLogin;
