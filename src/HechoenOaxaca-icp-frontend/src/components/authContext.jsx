// src/components/authContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Principal } from "@dfinity/principal";
import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client"; // ✅ IMPORT CORRECTO
import { idlFactory } from "../../../declarations/HechoenOaxaca-icp-backend";
import { useNavigate } from "react-router-dom";

// ✅ Detecta si estamos en mainnet automáticamente
const IS_MAINNET = window.location.hostname.endsWith(".icp0.io") || window.location.hostname === "ic0.app";

const LOCAL_CANISTER_ID = "br5f7-7uaaa-aaaaa-qaaca-cai";
const MAINNET_CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
const CANISTER_ID = IS_MAINNET ? MAINNET_CANISTER_ID : LOCAL_CANISTER_ID;
const host = IS_MAINNET ? "https://ic0.app" : "http://127.0.0.1:4943";

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principalId, setPrincipalId] = useState(localStorage.getItem("principalId") || null);
  const [identity, setIdentity] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const getBackendActor = useCallback(async (identity) => {
    if (!identity || identity.getPrincipal().isAnonymous()) {
      console.error("❌ Usuario no autenticado.");
      return null;
    }

    const agent = new HttpAgent({ identity, host });

    if (!IS_MAINNET) {
      try {
        console.log("🔄 Obteniendo clave raíz (modo dev)...");
        await agent.fetchRootKey();
      } catch (err) {
        console.error("❌ fetchRootKey falló:", err);
        return null;
      }
    }

    return Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID });
  }, []);

  const handleLogin = async (retry = false) => {
    try {
      setIsLoading(true);
      const authClient = await AuthClient.create();

      if (!retry) {
        await authClient.logout();
        await new Promise((r) => setTimeout(r, 1000));
      }

      await authClient.login({
        identityProvider: "https://nfid.one/authenticate",
        derivationOrigin: window.location.origin,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1_000_000_000),
        windowOpenerFeatures: "width=500,height=700",
        forceVerify: false,
      });

      await new Promise((r) => setTimeout(r, 2000));
      const isAuthenticated = await authClient.isAuthenticated();
      if (!isAuthenticated) {
        if (!retry) return handleLogin(true);
        alert("⚠️ No se pudo autenticar. Intenta nuevamente.");
        setIsLoading(false);
        return;
      }

      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal().toText();

      if (!principal || principal === "2vxsx-fae") {
        alert("⚠️ No puedes iniciar sesión de forma anónima.");
        setIsLoading(false);
        return;
      }

      setPrincipalId(principal);
      setIdentity(identity);
      setIsAuthenticated(true);
      localStorage.setItem("principalId", principal);

      const backendActor = await getBackendActor(identity);
      if (!backendActor) return;

      const usuarioExiste = await backendActor.verificarUsuario(Principal.fromText(principal));
      if (!usuarioExiste) {
        await backendActor.registrarUsuario();
      }

      const userRoleResponse = await backendActor.getRolUsuario(Principal.fromText(principal));
      if (userRoleResponse && userRoleResponse !== "NoAsignado") {
        setUserRole(userRoleResponse);
        navigate(`/${userRoleResponse.toLowerCase()}-dashboard`);
      } else {
        navigate("/registro");
      }

    } catch (error) {
      console.error("❌ Error en autenticación:", error);
      alert("Error en login. Revisa la consola.");
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

export { AuthContext };
