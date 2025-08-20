import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthClient } from "@dfinity/auth-client";
import { AnonymousIdentity, HttpAgent, Actor } from "@dfinity/agent";
import {
  idlFactory,
  canisterId as backendCanisterId,
} from "declarations/HechoenOaxaca-icp-backend";
import ModalProviderSelect from "../components/ModalProviderSelect";

const AuthContext = createContext(null);

// Estados posibles de autenticación
const AUTH_STATES = {
  INITIALIZING: "initializing",
  AUTHENTICATING: "authenticating",
  AUTHENTICATED: "authenticated",
  ANONYMOUS: "anonymous",
  ERROR: "error"
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(new AnonymousIdentity());
  const [actor, setActor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState({
    status: AUTH_STATES.INITIALIZING,
    error: null,
  });
  const [showProviderModal, setShowProviderModal] = useState(false);

  const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
  const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";
  const identityProvider = isLocal
    ? `http://${import.meta.env.VITE_II_CANISTER_ID}.localhost:4943`
    : "https://nfid.one/authenticate?applicationName=HechoEnOaxaca";

  // Configuración del actor con manejo de errores
  const setupActor = useCallback(async (id) => {
    try {
      const agent = new HttpAgent({ identity: id, host });
      if (isLocal) await agent.fetchRootKey();
      return Actor.createActor(idlFactory, {
        agent,
        canisterId: backendCanisterId,
      });
    } catch (error) {
      console.error("Error setting up actor:", error);
      throw error;
    }
  }, [host, isLocal]);

  // Redirección de usuario con verificación robusta
  const handleUserRedirect = useCallback(async (act) => {
    try {
      if (!act || typeof act.obtenerUsuario !== 'function') {
        throw new Error("Actor no tiene método obtenerUsuario");
      }

      const res = await act.obtenerUsuario();
      console.log("User data response:", res);

      if ("ok" in res) {
        const rol = Object.keys(res.ok.rol)[0];
        localStorage.setItem("rol", rol);
        setAuthState({ status: AUTH_STATES.AUTHENTICATED, error: null });
        
        const routeMap = {
          Artesano: "/artesano-dashboard",
          Cliente: "/cliente-dashboard",
          Intermediario: "/intermediario-dashboard"
        };
        
        navigate(routeMap[rol] || "/registro", { replace: true });
      } else {
        localStorage.removeItem("rol");
        setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
        navigate("/registro", { replace: true });
      }
    } catch (err) {
      console.error("Error en handleUserRedirect:", err);
      setAuthState({ 
        status: AUTH_STATES.ERROR, 
        error: err.message || "Error al verificar usuario" 
      });
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Inicialización del cliente de autenticación
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const client = await AuthClient.create();
        if (!isMounted) return;

        setAuthClient(client);
        const id = client.getIdentity();
        setIdentity(id);
        
        const isAuth = !id.getPrincipal().isAnonymous();
        const act = await setupActor(id);

        if (!isMounted) return;
        
        setActor(act);
        
        if (isAuth) {
          await handleUserRedirect(act);
        } else {
          setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
        }
      } catch (err) {
        console.error("Error inicializando auth:", err);
        if (isMounted) {
          setAuthState({ 
            status: AUTH_STATES.ERROR, 
            error: err.message || "Error de inicialización" 
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [setupActor, handleUserRedirect]);

  // Función de login mejorada
  const login = useCallback(async () => {
    if (!authClient) return;
    
    setAuthState({ status: AUTH_STATES.AUTHENTICATING, error: null });

    try {
      await authClient.login({
        identityProvider,
        onSuccess: async () => {
          const id = authClient.getIdentity();
          setIdentity(id);
          
          const act = await setupActor(id);
          setActor(act);
          await handleUserRedirect(act);
        },
        onError: (err) => {
          console.error("Error en login:", err);
          setAuthState({ 
            status: AUTH_STATES.ERROR, 
            error: err.message || "Error durante el login" 
          });
        },
        windowOpenerFeatures: `width=500,height=600,left=${window.screen.width/2 - 250},top=${window.screen.height/2 - 300}`
      });
    } catch (err) {
      console.error("Login fallido:", err);
      setAuthState({ 
        status: AUTH_STATES.ERROR, 
        error: err.message || "Error al iniciar sesión" 
      });
    }
  }, [authClient, identityProvider, setupActor, handleUserRedirect]);

  // Función de logout robusta
  const logout = useCallback(async () => {
    try {
      if (authClient) {
        await authClient.logout();
      }
      
      localStorage.clear();
      setIdentity(new AnonymousIdentity());
      setActor(null);
      setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error en logout:", err);
      setAuthState({
        status: AUTH_STATES.ERROR,
        error: err.message || "Error al cerrar sesión"
      });
    }
  }, [authClient, navigate]);

  // Conexión simplificada para componentes
  const connect = useCallback(() => {
    setShowProviderModal(true);
  }, []);

  // Valores derivados
  const principalId = useMemo(
    () => identity?.getPrincipal()?.toString() ?? null,
    [identity]
  );

  const isAuthenticated = useMemo(
    () => authState.status === AUTH_STATES.AUTHENTICATED,
    [authState.status]
  );

  const value = useMemo(() => ({
    isAuthenticated,
    principalId,
    isLoading,
    authState,
    rol: localStorage.getItem("rol") ?? null,
    actor,
    login,
    logout,
    connect,
    openProviderModal: () => setShowProviderModal(true),
  }), [
    isAuthenticated,
    principalId,
    isLoading,
    authState,
    actor,
    login,
    logout,
    connect
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showProviderModal && (
        <ModalProviderSelect
          isOpen={showProviderModal}
          onClose={() => setShowProviderModal(false)}
          onSelectProvider={(provider) => {
            localStorage.setItem("identityProvider", provider);
            setShowProviderModal(false);
            login();
          }}
          internetIdentityUrl="https://identity.ic0.app"
          nfidUrl="https://nfid.one/authenticate"
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  }
  return context;
};