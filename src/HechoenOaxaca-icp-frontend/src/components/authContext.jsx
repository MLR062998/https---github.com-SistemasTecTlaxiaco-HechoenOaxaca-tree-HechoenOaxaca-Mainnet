import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";

import { useNavigate } from "react-router-dom";

import { AuthClient } from "@dfinity/auth-client";

import {
  AnonymousIdentity,
  HttpAgent,
  Actor,
} from "@dfinity/agent";

import { idlFactory } from "declarations/HechoenOaxaca-icp-backend-v2";

const AuthContext = createContext(null);

// =====================================================
// Estados de autenticación
// =====================================================

const AUTH_STATES = {
  INITIALIZING: "initializing",
  AUTHENTICATING: "authenticating",
  AUTHENTICATED: "authenticated",
  ANONYMOUS: "anonymous",
  ERROR: "error",
};

// =====================================================
// CANISTER ID ICP MAINNET
// =====================================================

const BACKEND_CANISTER_ID =
  import.meta.env.VITE_BACKEND_CANISTER_ID ||
  "2ekj4-4qaaa-aaaae-qj2pq-cai";

console.log(
  "Backend Canister:",
  BACKEND_CANISTER_ID
);

// =====================================================
// SOLO principal anónimo REAL
// =====================================================

const ANONYMOUS_PRINCIPALS = new Set([
  "2vxsx-fae",
]);

// =====================================================
// Auth Provider
// =====================================================

export const AuthProvider = ({ children }) => {
  console.log(
    "VITE_BACKEND_CANISTER_ID:",
    import.meta.env
      .VITE_BACKEND_CANISTER_ID
  );

  const navigate = useNavigate();

  const [authClient, setAuthClient] =
    useState(null);

  const [identity, setIdentity] = useState(
    new AnonymousIdentity()
  );

  const [actor, setActor] = useState(null);

  const [rol, setRol] = useState(
    localStorage.getItem("rol") || null
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [authState, setAuthState] = useState({
    status: AUTH_STATES.INITIALIZING,
    error: null,
  });

  // =====================================================
  // ICP MAINNET
  // =====================================================

  const host = "https://icp-api.io";

  // =====================================================
  // NFID
  // =====================================================

  const identityProvider =
    "https://nfid.one/authenticate?applicationName=HechoEnOaxaca";

  // =====================================================
  // Detectar principal anónimo
  // =====================================================

  const isAnonymousPrincipal = useCallback(
    (principal) => {
      if (!principal) return true;

      try {
        const principalText =
          principal.toText();

        return (
          principal.isAnonymous() ||
          ANONYMOUS_PRINCIPALS.has(
            principalText
          )
        );
      } catch {
        return true;
      }
    },
    []
  );

  // =====================================================
  // Crear actor ICP
  // =====================================================

  const setupActor = useCallback(
    async (id) => {
      try {
        if (!BACKEND_CANISTER_ID) {
          throw new Error(
            "BACKEND_CANISTER_ID no definido"
          );
        }

        const agent = new HttpAgent({
          identity: id,
          host,
        });

        if (
          window.location.hostname ===
            "localhost" ||
          window.location.hostname ===
            "127.0.0.1"
        ) {
          await agent.fetchRootKey();
        }

        console.log(
          "Creando actor para:",
          BACKEND_CANISTER_ID
        );

        const actorInstance =
          Actor.createActor(idlFactory, {
            agent,
            canisterId:
              BACKEND_CANISTER_ID,
          });

        return actorInstance;
      } catch (error) {
        console.error(
          "Error creando actor:",
          error
        );

        throw error;
      }
    },
    []
  );

  // =====================================================
  // Redirección por rol
  // =====================================================

  const handleUserRedirect = useCallback(
    async (act, principal) => {
      try {
        // Usuario anónimo
        if (
          isAnonymousPrincipal(principal)
        ) {
          setAuthState({
            status:
              AUTH_STATES.ANONYMOUS,
            error: null,
          });

          return;
        }

        // Validar actor
        if (
          typeof act?.obtenerUsuario !==
          "function"
        ) {
          throw new Error(
            "El actor no contiene obtenerUsuario"
          );
        }

        // ======= LOG: Llamada a obtenerUsuario =======
        console.log("📞 Llamando a obtenerUsuario con principal:", principal.toText());

        // Obtener usuario
        const response =
          await act.obtenerUsuario();

        // ======= LOG: Respuesta completa =======
        console.log("========== RESPUESTA BACKEND ==========");
        console.log(response);
        console.log("=======================================");

        // Usuario encontrado
        if ("ok" in response) {
          const rolData =
            response.ok?.rol;

          if (
            !rolData ||
            typeof rolData !==
              "object"
          ) {
            throw new Error(
              "Rol inválido"
            );
          }

          const userRol =
            Object.keys(rolData)[0];

          setRol(userRol);

          localStorage.setItem(
            "rol",
            userRol
          );

          setAuthState({
            status:
              AUTH_STATES.AUTHENTICATED,
            error: null,
          });

          // =====================================================
          // 🔥 NUEVO: Definir rutas permitidas por rol
          // =====================================================
          const allowedRoutes = {
            Artesano: [
              "/artesano-dashboard",
            ],
            Cliente: [
              "/cliente-dashboard",
              "/carrito",
              "/notificaciones-cliente",
              "/checkout-confirmado",
            ],
            Intermediario: [
              "/intermediario-dashboard",
            ],
          };

          const targetRoute = {
            Artesano: "/artesano-dashboard",
            Cliente: "/cliente-dashboard",
            Intermediario: "/intermediario-dashboard",
          }[userRol] || "/registro";

          // Verificar si la ruta actual está permitida para el rol
          const isAllowed = (
            allowedRoutes[userRol] || []
          ).some((route) =>
            window.location.pathname.startsWith(route)
          );

          // Redirigir solo si la ruta NO está permitida
          if (!isAllowed) {
            navigate(targetRoute, { replace: true });
          }
        }

        // Usuario no registrado
        else {
          console.log("❌ Usuario no registrado (response.err):", response.err);

          setRol(null);

          localStorage.removeItem(
            "rol"
          );

          setAuthState({
            status:
              AUTH_STATES.ANONYMOUS,
            error: null,
          });

          if (
            window.location.pathname !==
            "/registro"
          ) {
            navigate("/registro");
          }
        }
      } catch (err) {
        console.error(
          "❌ ERROR en handleUserRedirect:",
          err
        );
        console.error("STACK:", err.stack);

        setAuthState({
          status: AUTH_STATES.ERROR,

          error:
            err?.message ||
            "Error verificando usuario",
        });

        // 🔥 COMENTADO temporalmente para evitar redirección automática
        // navigate("/");
      }
    },
    [
      isAnonymousPrincipal,
      navigate,
    ]
  );

  // =====================================================
  // Inicializar autenticación
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const client =
          await AuthClient.create();

        if (!mounted) return;

        setAuthClient(client);

        // Verificar autenticación
        const isAuth =
          await client.isAuthenticated();

        const id =
          client.getIdentity();

        const principal =
          id.getPrincipal();

        setIdentity(id);

        const actorInstance =
          await setupActor(id);

        if (!mounted) return;

        setActor(actorInstance);

        // Usuario autenticado
        if (
          isAuth &&
          !isAnonymousPrincipal(
            principal
          )
        ) {
          await handleUserRedirect(
            actorInstance,
            principal
          );
        }

        // Usuario anónimo
        else {
          setAuthState({
            status:
              AUTH_STATES.ANONYMOUS,
            error: null,
          });
        }
      } catch (err) {
        console.error(
          "Error inicializando auth:",
          err
        );

        if (mounted) {
          setAuthState({
            status:
              AUTH_STATES.ERROR,

            error:
              "No fue posible conectar con ICP",
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [
    setupActor,
    isAnonymousPrincipal,
    handleUserRedirect,
  ]);

  // =====================================================
  // LOGIN NFID
  // =====================================================

  const login = useCallback(
    async () => {
      if (!authClient) return;

      try {
        setAuthState({
          status:
            AUTH_STATES.AUTHENTICATING,
          error: null,
        });

        await authClient.login({
          identityProvider,

          // 7 días
          maxTimeToLive:
            BigInt(
              7 *
                24 *
                60 *
                60 *
                1000000000
            ),

          onSuccess: async () => {
            try {
              const id =
                authClient.getIdentity();

              const principal =
                id.getPrincipal();

              // ======= LOG: Principal =======
              console.log("🔑 Principal después de login:", principal.toText());

              setIdentity(id);

              const actorInstance =
                await setupActor(id);

              setActor(actorInstance);

              await handleUserRedirect(
                actorInstance,
                principal
              );
            } catch (err) {
              console.error(
                "Error post login:",
                err
              );

              setAuthState({
                status:
                  AUTH_STATES.ERROR,

                error:
                  "Error obteniendo usuario",
              });
            }
          },

          onError: (err) => {
            console.error(
              "Error login NFID:",
              err
            );

            setAuthState({
              status:
                AUTH_STATES.ERROR,

              error:
                "Error autenticando con NFID",
            });
          },

          windowOpenerFeatures: `
            left=${
              window.screen.width /
                2 -
              250
            },
            top=${
              window.screen.height /
                2 -
              300
            },
            toolbar=0,
            location=0,
            menubar=0,
            width=500,
            height=600
          `,
        });
      } catch (err) {
        console.error(
          "Login fallido:",
          err
        );

        setAuthState({
          status: AUTH_STATES.ERROR,

          error:
            "No fue posible iniciar sesión",
        });
      }
    },
    [
      authClient,
      setupActor,
      handleUserRedirect,
    ]
  );

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = useCallback(
    async () => {
      try {
        if (authClient) {
          await authClient.logout();
        }

        setRol(null);

        localStorage.removeItem(
          "rol"
        );

        setIdentity(
          new AnonymousIdentity()
        );

        setActor(null);

        setAuthState({
          status:
            AUTH_STATES.ANONYMOUS,
          error: null,
        });

        navigate("/");
      } catch (err) {
        console.error(
          "Error logout:",
          err
        );

        setAuthState({
          status: AUTH_STATES.ERROR,

          error:
            "Error cerrando sesión",
        });
      }
    },
    [authClient, navigate]
  );

  // =====================================================
  // CONNECT
  // =====================================================

  const connect = login;

  // =====================================================
  // Principal ID (string) y Principal (objeto)
  // =====================================================

  // Obtener el objeto Principal directamente desde identity
  const principal = useMemo(() => {
    try {
      return identity?.getPrincipal() || null;
    } catch {
      return null;
    }
  }, [identity]);

  const principalId = useMemo(() => {
    try {
      return principal?.toText() || null;
    } catch {
      return null;
    }
  }, [principal]);

  // =====================================================
  // Usuario autenticado
  // =====================================================

  const isAuthenticated =
    useMemo(() => {
      return (
        authState.status ===
        AUTH_STATES.AUTHENTICATED
      );
    }, [authState.status]);

  // =====================================================
  // Context Value
  // =====================================================

  const value = useMemo(
    () => ({
      isAuthenticated,
      principal,          // <-- NUEVO: objeto Principal (para llamadas)
      principalId,        // <-- string (para mostrar)
      isLoading,
      authState,
      rol,
      actor,
      login,
      logout,
      connect,
      isAnonymous:
        authState.status ===
        AUTH_STATES.ANONYMOUS,
    }),
    [
      isAuthenticated,
      principal,
      principalId,
      isLoading,
      authState,
      rol,
      actor,
      login,
      logout,
      connect,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// =====================================================
// Hook personalizado
// =====================================================

export const useAuthContext = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext debe usarse dentro de AuthProvider"
    );
  }

  return context;
};