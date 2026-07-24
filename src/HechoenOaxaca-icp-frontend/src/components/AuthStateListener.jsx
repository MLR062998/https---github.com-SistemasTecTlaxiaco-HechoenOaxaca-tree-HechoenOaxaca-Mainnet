import { useEffect } from "react";
import { useAuthContext } from "./authContext";
import { useVerifyUserRedirect } from "./useVerifyUserRedirect";

export const AuthStateListener = () => {
  const { authState, actor, principalId, isAuthenticated } = useAuthContext();

  useEffect(() => {
    console.log("📡 [AuthListener] Estado:", authState.status);
    console.log("🎭 [AuthListener] Actor disponible:", !!actor);
    console.log("🧾 [AuthListener] Principal ID:", principalId);
    console.log("🔐 [AuthListener] Autenticado:", isAuthenticated);
    
    // ✅ Log adicional para debugging de anónimos
    if (principalId) {
      const isAnonymous = principalId === "2vxsx-fae" || principalId.endsWith("-cai");
      console.log("👤 [AuthListener] Es anónimo:", isAnonymous);
    }
  }, [authState, actor, principalId, isAuthenticated]);

  // ✅ useVerifyUserRedirect ahora maneja TODAS las redirecciones
  useVerifyUserRedirect();
  
  return null;
};