// src/components/authContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { AnonymousIdentity, HttpAgent } from "@dfinity/agent";
import ModalProviderSelect from "./ModalProviderSelect";
import { idlFactory, canisterId } from "declarations/HechoenOaxaca-icp-backend";
import { Actor } from "@dfinity/agent";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(new AnonymousIdentity());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [actor, setActor] = useState(null);

  useEffect(() => {
    AuthClient.create().then(async (client) => {
      setAuthClient(client);
      const id = client.getIdentity();
      setIdentity(id);
      setIsAuthenticated(!id.getPrincipal().isAnonymous());
      const agent = new HttpAgent({ identity: id });
      if (import.meta.env.VITE_DFX_NETWORK !== "ic") await agent.fetchRootKey();
      const act = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });
      setActor(act);
      setIsLoading(false);
    });
  }, []);

  const login = async () => {
    const savedProvider =
      localStorage.getItem("identityProvider") ||
      "https://nfid.one/authenticate";
    if (!authClient) return;

    await authClient.login({
      identityProvider: savedProvider,
      onSuccess: async () => {
        const id = authClient.getIdentity();
        setIdentity(id);
        setIsAuthenticated(true);
        const agent = new HttpAgent({ identity: id });
        if (import.meta.env.VITE_DFX_NETWORK !== "ic") await agent.fetchRootKey();
        const act = Actor.createActor(idlFactory, {
          agent,
          canisterId,
        });
        setActor(act);
      },
      onError: (err) => {
        console.error("❌ Error de login:", err);
      },
    });
  };

  const selectProviderAndLogin = async (provider) => {
    localStorage.setItem("identityProvider", provider);
    setShowProviderModal(false);
    await login();
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    localStorage.clear();
    setIdentity(new AnonymousIdentity());
    setIsAuthenticated(false);
    setActor(null);
  };

  const principalId = useMemo(
    () => identity?.getPrincipal()?.toString?.() ?? null,
    [identity]
  );

  const value = {
    isAuthenticated,
    principalId,
    isLoading,
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
          onSelectProvider={selectProviderAndLogin}
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
