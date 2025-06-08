import { useEffect } from "react";
import { useAuthContext } from "./authContext";
import { useVerifyUserRedirect } from "./useVerifyUserRedirect";

export const AuthStateListener = () => {
  const { authState, actor, principalId } = useAuthContext();

  useEffect(() => {
    console.log("📡 [AuthListener] Estado:", authState.status);
    console.log("🎭 [AuthListener] Actor disponible:", !!actor);
    console.log("🧾 [AuthListener] Principal ID:", principalId);
  }, [authState, actor, principalId]);

  useVerifyUserRedirect();
  return null;
};
