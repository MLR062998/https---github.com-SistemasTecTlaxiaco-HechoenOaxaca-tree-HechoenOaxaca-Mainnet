import React, { createContext, useContext, useState, useEffect } from "react";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/HechoenOaxaca-icp-backend";
import { useNavigate } from "react-router-dom";

const LOCAL_CANISTER_ID = "br5f7-7uaaa-aaaaa-qaaca-cai";
const MAINNET_CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";

const canisterId =
  process.env.DFX_NETWORK === "ic" ? MAINNET_CANISTER_ID : LOCAL_CANISTER_ID;

export const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [principalId, setPrincipalId] = useState(null);
  const [identity, setIdentity] = useState(null);

  const navigate = useNavigate();

  // 🔹 Obtener el backend actor autenticado con la identidad correcta
  const getBackendActor = async (identity) => {
    if (!identity) {
      console.error("❌ No se pudo obtener identidad.");
      return null;
    }

    const host =
      process.env.DFX_NETWORK === "ic"
        ? "https://ic0.app"
        : "http://127.0.0.1:4943";

    // 💡 PASO CRUCIAL: Configurar el agente sin identidad por defecto
    const agent = new HttpAgent({ host });

    // 🔹 Asegurar que la identidad autenticada se usa para solicitudes
    agent.replaceIdentity(identity);

    if (process.env.DFX_NETWORK !== "ic") {
      try {
        console.log("🔄 Obteniendo clave raíz en desarrollo...");
        await agent.fetchRootKey();
        console.log("✅ Clave raíz obtenida correctamente.");
      } catch (err) {
        console.error("❌ Error obteniendo la clave raíz:", err);
      }
    }

    return Actor.createActor(idlFactory, { agent, canisterId });
  };

  // 🔹 Obtener el rol del usuario desde el backend
  const fetchUserRole = async (identity, principal) => {
    try {
      if (!principal) {
        console.warn("⚠️ No hay principal para verificar rol.");
        return;
      }

      console.log("🔹 Obteniendo backend actor...");
      const backendActor = await getBackendActor(identity);
      if (!backendActor) {
        console.error("❌ No se pudo obtener backend actor.");
        return;
      }

      console.log("🎭 Consultando rol en el backend...");
      const principalObj = Principal.fromText(principal);
      const userRoleResponse = await backendActor.getRolUsuario(principalObj);

      if (userRoleResponse && typeof userRoleResponse === "string" && userRoleResponse !== "NoAsignado") {
        console.log("✅ Rol asignado:", userRoleResponse);
        localStorage.setItem("userRole", userRoleResponse.toLowerCase());
        setUserRole(userRoleResponse.toLowerCase());
      } else {
        console.warn("⚠️ Rol no encontrado, redirigiendo al registro.");
        localStorage.removeItem("userRole");
        setUserRole(null);
        navigate("/registro");
      }
    } catch (err) {
      console.error("❌ Error al obtener el rol del usuario:", err);
    }
  };

  // 🔹 Manejar inicio de sesión con NFID
  const handleLogin = async () => {
    try {
      console.log("🔄 Creando AuthClient...");
      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();

      console.log("🔄 Intentando iniciar sesión con NFID...");
      await authClient.login({
        identityProvider: "https://nfid.one/authenticate",
        derivationOrigin: window.location.origin,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1_000_000_000),
        windowOpenerFeatures: "width=500,height=700",
        forceVerify: true 
      });

      if (!(await authClient.isAuthenticated())) {
        console.error("🚨 No se pudo autenticar al usuario.");
        alert("Error de autenticación. Intenta nuevamente.");
        return;
      }

      console.log("✅ Autenticación exitosa, obteniendo identidad...");
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal().toText();

      if (!principal || principal === "2vxsx-fae") {
        console.error("🚨 NFID devolvió Principal anónimo.");
        alert("⚠️ No puedes conectarte en modo anónimo. Verifica tu cuenta NFID.");
        return;
      }

      console.log("✅ Usuario autenticado con Principal:", principal);
      setPrincipalId(principal);
      setIdentity(identity);
      setIsAuthenticated(true);
      localStorage.setItem("principalId", principal);

      await fetchUserRole(identity, principal);
    } catch (error) {
      console.error("❌ Error en la autenticación:", error);
      alert("Error de autenticación. Ver consola para más detalles.");
    }
  };

  // 🔹 Verificar sesión al cargar la página
  useEffect(() => {
    const checkSession = async () => {
      console.log("🔄 Verificando sesión almacenada...");
      const storedPrincipal = localStorage.getItem("principalId");
      const storedRole = localStorage.getItem("userRole");

      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();

      const isReallyAuthenticated = await authClient.isAuthenticated();
      console.log(`🔎 authClient.isAuthenticated(): ${isReallyAuthenticated}`);

      if (storedPrincipal && isReallyAuthenticated) {
        console.log("✅ Sesión activa detectada.");
        setPrincipalId(storedPrincipal);
        setIsAuthenticated(true);

        const identity = authClient.getIdentity();
        setIdentity(identity);
        await fetchUserRole(identity, storedPrincipal);
      } else {
        console.log("🔹 No se encontró sesión activa. Limpiando...");
        localStorage.removeItem("principalId");
        setIsAuthenticated(false);
        setPrincipalId(null);
        setIdentity(null);
      }

      if (storedRole) {
        console.log("✅ Rol encontrado en almacenamiento:", storedRole);
        setUserRole(storedRole);
      }

      setIsLoading(false);
    };

    checkSession();
  }, []);

  // 🔹 Manejar cierre de sesión
  const handleDisconnect = async () => {
    console.log("🔄 Cerrando sesión...");

    localStorage.clear();
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    setPrincipalId(null);
    setIdentity(null);

    const { AuthClient } = await import("@dfinity/auth-client");
    const authClient = await AuthClient.create();
    await authClient.logout(); 

    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userRole,
        principalId,
        handleDisconnect,
        handleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
