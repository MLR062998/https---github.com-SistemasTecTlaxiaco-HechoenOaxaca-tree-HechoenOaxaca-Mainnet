import React from "react";
import { useAuthContext } from "./authContext";

export default function DebugStatus() {
  const { isAuthenticated, principalId, actor, isReady, rol } = useAuthContext();

  if (import.meta.env.PROD) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      background: "#111",
      color: "#0f0",
      fontSize: 12,
      padding: 10,
      zIndex: 9999
    }}>
      <div>Auth: {String(isAuthenticated)} | Ready: {String(isReady)}</div>
      <div>Principal: {principalId}</div>
      <div>Actor: {actor ? "✅" : "❌"}</div>
      <div>Rol: {rol ?? "N/A"}</div>
    </div>
  );
}
