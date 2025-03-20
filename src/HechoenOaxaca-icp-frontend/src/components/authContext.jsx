import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/HechoenOaxaca-icp-backend";
import { useNavigate } from "react-router-dom";

// Definir Canister IDs
const LOCAL_CANISTER_ID = "br5f7-7uaaa-aaaaa-qaaca-cai";
const MAINNET_CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
const CANISTER_ID = process.env.DFX_NETWORK === "ic" ? MAINNET_CANISTER_ID : LOCAL_CANISTER_ID;

// Crear contexto de autenticación
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  return context;
};

// Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principalId, setPrincipalId] = useState(localStorage.getItem("principalId") || null);
  const [identity, setIdentity] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const getBackendActor = useCallback(async (identity) => {
    if (!identity || identity.getPrincipal().isAnonymous()) {
      console.error("❌ Error: El usuario no está autenticado.");
      return null;
    }

    const host = process.env.DFX_NETWORK === "ic" ? "https://ic0.app" : "http://127.0.0.1:4943";
    const agent = new HttpAgent({ identity, host });

    try {
      console.log("✅ Identidad asignada correctamente:", identity.getPrincipal().toText());
    } catch (error) {
      console.error("❌ Error asignando identidad al agente:", error);
      return null;
    }

    if (process.env.DFX_NETWORK !== "ic") {
      try {
        await agent.fetchRootKey();
      } catch (err) {
        console.error("❌ Error obteniendo la clave raíz:", err);
        return null;
      }
    }

    return Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID });
  }, []);

  const handleLogin = async (retry = false) => {
    try {
      setIsLoading(true);
      console.log("🔄 Creando AuthClient...");
      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();

      if (!retry) {
        await authClient.logout();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("🔄 Iniciando sesión con NFID...");
      await authClient.login({
        identityProvider: "https://nfid.one/authenticate",
        derivationOrigin: window.location.origin,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1_000_000_000),
        windowOpenerFeatures: "width=500,height=700",
        forceVerify: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (!(await authClient.isAuthenticated())) {
        console.error("🚨 No se pudo autenticar al usuario.");
        if (!retry) return handleLogin(true);
        alert("Error de autenticación. Intenta nuevamente.");
        setIsLoading(false);
        return;
      }

      const identity = authClient.getIdentity();
      if (!identity) {
        console.error("❌ No se pudo obtener identidad válida.");
        alert("Error de identidad. Intenta nuevamente.");
        setIsLoading(false);
        return;
      }

      const principal = identity.getPrincipal().toText();
      if (!principal || principal === "2vxsx-fae") {
        console.error("🚨 NFID devolvió Principal anónimo.");
        alert("⚠️ No puedes conectarte en modo anónimo. Verifica tu cuenta NFID.");
        setIsLoading(false);
        return;
      }

      console.log("✅ Usuario autenticado con Principal:", principal);
      setPrincipalId(principal);
      setIdentity(identity);
      setIsAuthenticated(true);
      localStorage.setItem("principalId", principal);

    } catch (error) {
      console.error("❌ Error en la autenticación:", error);
      alert("Error de autenticación. Ver consola para más detalles.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, principalId, userRole, isLoading, handleLogin }}>
      {isLoading ? <p>Cargando...</p> : children}
    </AuthContext.Provider>
  );
};

// Exportar el contexto para ser utilizado en otros componentes
export { AuthContext };
