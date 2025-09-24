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

const AuthContext = createContext(null);

// Estados posibles de autenticación
const AUTH_STATES = {
  INITIALIZING: "initializing",
  AUTHENTICATING: "authenticating",
  AUTHENTICATED: "authenticated",
  ANONYMOUS: "anonymous",
  ERROR: "error"
};

// Principales anónimos conocidos
const ANONYMOUS_PRINCIPALS = new Set([
  "2vxsx-fae",
  "2vxsx-fae-cai"
]);

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

  // ✅ CONFIGURACIÓN SOLO NFID PARA MAINNET
  const host = "https://icp-api.io";
  const identityProvider = "https://nfid.one/authenticate?applicationName=HechoEnOaxaca";

  // ✅ Función para detectar si es principal anónimo (ESTABLE)
  const isAnonymousPrincipal = useCallback((principal) => {
    if (!principal) return true;
    const principalText = principal.toString();
    return principal.isAnonymous() || 
           ANONYMOUS_PRINCIPALS.has(principalText) ||
           principalText.endsWith("-cai");
  }, []);

  // Configuración del actor (ESTABLE)
  const setupActor = useCallback(async (id) => {
    try {
      const agent = new HttpAgent({ identity: id, host });
      return Actor.createActor(idlFactory, {
        agent,
        canisterId: backendCanisterId,
      });
    } catch (error) {
      console.error("Error setting up actor:", error);
      throw error;
    }
  }, [host]);

  // ✅ Redirección de usuario - MOVIDA FUERA para evitar recreación constante
  const handleUserRedirect = useCallback(async (act, principal) => {
    try {
      if (isAnonymousPrincipal(principal)) {
        setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
        return;
      }

      if (!act || typeof act.obtenerUsuario !== 'function') {
        throw new Error("Actor no tiene método obtenerUsuario");
      }

      const res = await act.obtenerUsuario();
      
      if ("ok" in res) {
        const rol = Object.keys(res.ok.rol)[0];
        localStorage.setItem("rol", rol);
        setAuthState({ status: AUTH_STATES.AUTHENTICATED, error: null });
        
        const routeMap = {
          Artesano: "/artesano-dashboard",
          Cliente: "/cliente-dashboard",
          Intermediario: "/intermediario-dashboard"
        };
        
        const targetRoute = routeMap[rol] || "/registro";
        
        // ✅ Solo navegar si no estamos ya en la ruta correcta
        if (window.location.pathname !== targetRoute) {
          navigate(targetRoute);
        }
      } else {
        localStorage.removeItem("rol");
        setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
        
        // ✅ Solo navegar si no estamos ya en registro
        if (window.location.pathname !== "/registro") {
          navigate("/registro");
        }
      }
    } catch (err) {
      console.error("Error en handleUserRedirect:", err);
      setAuthState({ 
        status: AUTH_STATES.ERROR, 
        error: err.message || "Error al verificar usuario" 
      });
      
      if (window.location.pathname !== "/") {
        navigate("/");
      }
    }
  }, [isAnonymousPrincipal]); // ✅ REMOVIDA 'navigate' de las dependencias

  // Inicialización del cliente de autenticación
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const client = await AuthClient.create();
        if (!isMounted) return;

        setAuthClient(client);
        const id = client.getIdentity();
        const principal = id.getPrincipal();
        
        setIdentity(id);
        
        const act = await setupActor(id);

        if (!isMounted) return;
        
        setActor(act);
        
        const isAuth = !isAnonymousPrincipal(principal);
        
        if (isAuth) {
          await handleUserRedirect(act, principal);
        } else {
          setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
        }
      } catch (err) {
        console.error("Error inicializando auth:", err);
        if (isMounted) {
          setAuthState({ 
            status: AUTH_STATES.ERROR, 
            error: "Error de conexión con Internet Computer" 
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
  }, [setupActor, isAnonymousPrincipal]); // ✅ REMOVIDA handleUserRedirect de las dependencias

  // ✅ Función de login SOLO con NFID
  const login = useCallback(async () => {
    if (!authClient) return;
    
    setAuthState({ status: AUTH_STATES.AUTHENTICATING, error: null });

    try {
      await authClient.login({
        identityProvider, // ✅ Solo NFID
        onSuccess: async () => {
          const id = authClient.getIdentity();
          const principal = id.getPrincipal();
          setIdentity(id);
          
          const act = await setupActor(id);
          setActor(act);
          await handleUserRedirect(act, principal);
        },
        onError: (err) => {
          console.error("Error en login NFID:", err);
          setAuthState({ 
            status: AUTH_STATES.ERROR, 
            error: "Error durante la autenticación con NFID" 
          });
        },
        windowOpenerFeatures: `width=500,height=600,left=${window.screen.width/2 - 250},top=${window.screen.height/2 - 300}`
      });
    } catch (err) {
      console.error("Login NFID fallido:", err);
      setAuthState({ 
        status: AUTH_STATES.ERROR, 
        error: "Error al iniciar sesión con NFID" 
      });
    }
  }, [authClient, identityProvider, setupActor, handleUserRedirect]);

  // Función de logout
  const logout = useCallback(async () => {
    try {
      if (authClient) {
        await authClient.logout();
      }
      
      localStorage.removeItem("rol");
      setIdentity(new AnonymousIdentity());
      setActor(null);
      setAuthState({ status: AUTH_STATES.ANONYMOUS, error: null });
      
      // ✅ Usar window.location en lugar de navigate para evitar dependencias
      window.location.href = "/";
    } catch (err) {
      console.error("Error en logout:", err);
      setAuthState({
        status: AUTH_STATES.ERROR,
        error: "Error al cerrar sesión"
      });
    }
  }, [authClient]); // ✅ REMOVIDA 'navigate' de las dependencias

  // ✅ Conexión directa a NFID (sin modal de selección)
  const connect = useCallback(() => {
    login();
  }, [login]);

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
    isAnonymous: authState.status === AUTH_STATES.ANONYMOUS
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