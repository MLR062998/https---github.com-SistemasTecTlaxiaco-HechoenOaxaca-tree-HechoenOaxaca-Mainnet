import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./authContext";
import { handleActorError } from "../utils/handleActorError";

export function useVerifyUserRedirect() {
  const { authState, actor, logout, principalId } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      authState.status !== "authenticated" ||
      !actor ||
      typeof actor?.obtenerUsuario !== "function" ||
      !principalId ||
      principalId === "2vxsx-fae"
    ) {
      console.warn("⏳ useVerifyUserRedirect: esperando actor válido y autenticación...");
      return;
    }

    let cancelled = false;

    const verifyAndRedirect = async () => {
      console.log("✅ Verificando sesión y rol...");

      try {
        const res = await actor.obtenerUsuario();
        console.log("📦 obtenerUsuario:", res);

        if (cancelled) return;

        if ("ok" in res) {
          const rol = Object.keys(res.ok.rol)[0];
          localStorage.setItem("rol", rol);

          const route = {
            Artesano: "/artesano-dashboard",
            Cliente: "/cliente-dashboard",
            Intermediario: "/intermediario-dashboard",
          }[rol] || "/registro";

          console.log("🚀 Redirigiendo a:", route);
          navigate(route, { replace: true });
        } else {
          console.log("🆕 Usuario no registrado. Redirigiendo a /registro");
          navigate("/registro", { replace: true });
        }
      } catch (err) {
        console.error("❌ Error al verificar usuario:", err);
        const handled = await handleActorError(err, logout);
        if (!handled && !cancelled) {
          console.warn("🛑 Sesión inválida. Forzando logout...");
          await logout();
          navigate("/registro", { replace: true });
        }
      }
    };

    const timer = setTimeout(verifyAndRedirect, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authState.status, actor, principalId]);
}
