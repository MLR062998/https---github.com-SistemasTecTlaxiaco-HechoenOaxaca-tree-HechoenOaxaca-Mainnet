import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
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

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(new AnonymousIdentity());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [actor, setActor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState({
    status: "initializing",
    error: null,
  });
  const [showProviderModal, setShowProviderModal] = useState(false);

  const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";

  const host = isLocal
    ? "http://127.0.0.1:4943"
    : "https://icp-api.io";

  const identityProvider = isLocal
    ? `http://${import.meta.env.VITE_II_CANISTER_ID}.localhost:4943`
    : "https://nfid.one/authenticate?applicationName=HechoEnOaxaca";

  const setupActor = async (id) => {
    const agent = new HttpAgent({ identity: id, host });
    if (isLocal) await agent.fetchRootKey();
    return Actor.createActor(idlFactory, {
      agent,
      canisterId: backendCanisterId,
    });
  };

  const handleUserRedirect = async (act) => {
    try {
      const res = await act.obtenerUsuario();
      if ("ok" in res) {
        const rol = Object.keys(res.ok.rol)[0];
        localStorage.setItem("rol", rol);
        setAuthState({ status: "authenticated", error: null });
        navigate(
          {
            Artesano: "/artesano-dashboard",
            Cliente: "/cliente-dashboard",
            Intermediario: "/intermediario-dashboard",
          }[rol] || "/registro",
          { replace: true }
        );
      } else {
        localStorage.removeItem("rol");
        setAuthState({ status: "anonymous", error: null });
        navigate("/registro", { replace: true });
      }
    } catch (err) {
      console.error("🚨 obtenerUsuario error:", err);
      setAuthState({ status: "anonymous", error: err.message });
      navigate("/registro", { replace: true });
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);
        const id = client.getIdentity();
        setIdentity(id);
        const isAuth = !id.getPrincipal().isAnonymous();
        setIsAuthenticated(isAuth);

        const act = await setupActor(id);
        setActor(act);

        if (isAuth) {
          await handleUserRedirect(act);
        } else {
          setAuthState({ status: "anonymous", error: null });
        }
      } catch (err) {
        console.error("❌ Error inicializando auth:", err);
        setAuthState({ status: "anonymous", error: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async () => {
    if (!authClient) return;
    setAuthState({ status: "authenticating", error: null });

    try {
      await authClient.login({
        identityProvider,
        onSuccess: async () => {
          const id = authClient.getIdentity();
          setIdentity(id);
          setIsAuthenticated(true);

          const act = await setupActor(id);
          setActor(act);
          await handleUserRedirect(act);
        },
        onError: (err) => {
          console.error("⚠️ Login error:", err);
          setAuthState({ status: "anonymous", error: err.message });
        },
      });
    } catch (err) {
      console.error("⚠️ Login failed:", err);
      setAuthState({ status: "anonymous", error: err.message });
    }
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    localStorage.clear();
    setIdentity(new AnonymousIdentity());
    setIsAuthenticated(false);
    setActor(null);
    setAuthState({ status: "anonymous", error: null });
    navigate("/", { replace: true });
  };

  const principalId = useMemo(
    () => identity?.getPrincipal()?.toString?.() ?? null,
    [identity]
  );

  const value = {
    isAuthenticated,
    principalId,
    isLoading,
    authState,
    rol: localStorage.getItem("rol") ?? null,
    login,
    logout,
    actor,
    openProviderModal: () => setShowProviderModal(true),
  };

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
  if (!context)
    throw new Error("useAuthContext debe usarse dentro de un AuthProvider");
  return context;
};
