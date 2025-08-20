import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./authContext";
import { handleActorError } from "../utils/handleActorError";

export function useVerifyUserRedirect() {
  const { authState, actor, logout, principalId, isLoading } = useAuthContext();
  const navigate = useNavigate();
  const verificationAttempted = useRef(false);

  useEffect(() => {
    // Evitar múltiples ejecuciones
    if (verificationAttempted.current || isLoading) return;

    // Verificar condiciones para proceder
    const shouldProceed = 
      authState.status === "authenticated" &&
      actor &&
      typeof actor.obtenerUsuario === "function" &&
      principalId &&
      principalId !== "2vxsx-fae";

    if (!shouldProceed) {
      console.log("⏳ Esperando condiciones:", {
        autenticado: authState.status === "authenticated",
        actor: !!actor,
        metodo: typeof actor?.obtenerUsuario,
        principal: principalId && principalId !== "2vxsx-fae",
        loading: isLoading
      });
      return;
    }

    verificationAttempted.current = true;
    let isMounted = true;

    const verifyAndRedirect = async () => {
      console.log("🔍 Iniciando verificación de usuario...");

      try {
        const res = await actor.obtenerUsuario();
        console.log("📦 Respuesta de obtenerUsuario:", res);

        if (!isMounted) return;

        if ("ok" in res) {
          const rol = Object.keys(res.ok.rol)[0];
          localStorage.setItem("rol", rol);

          const route = {
            Artesano: "/artesano-dashboard",
            Cliente: "/cliente-dashboard",
            Intermediario: "/intermediario-dashboard"
          }[rol] || "/registro";

          console.log("🚀 Redirigiendo a:", route);
          navigate(route, { replace: true });
        } else {
          console.log("🆕 Usuario no registrado - Redirigiendo a registro");
          navigate("/registro", { replace: true });
        }
      } catch (err) {
        console.error("🚨 Error en verificación:", err);
        if (!isMounted) return;

        const handled = await handleActorError(err, logout);
        if (!handled) {
          console.warn("⚠️ Sesión inválida - Forzando logout");
          await logout();
          navigate("/", { replace: true });
        }
      }
    };

    const timer = setTimeout(verifyAndRedirect, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [authState.status, actor, principalId, isLoading, navigate, logout]);
}