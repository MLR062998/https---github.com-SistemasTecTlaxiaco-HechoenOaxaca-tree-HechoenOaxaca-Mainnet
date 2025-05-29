import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./authContext";

export function useVerifyUserRedirect() {
  const { isAuthenticated, principalId, actor, isReady } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady || !actor || !isAuthenticated || !principalId) return;

    const verificar = async () => {
      try {
        const res = await actor.obtenerUsuario();
        if ("ok" in res) {
          const rol = Object.keys(res.ok.rol)[0];
          localStorage.setItem("rol", rol);
          switch (rol) {
            case "Artesano":
              navigate("/artesano-dashboard", { replace: true }); break;
            case "Cliente":
              navigate("/cliente-dashboard", { replace: true }); break;
            case "Intermediario":
              navigate("/intermediario-dashboard", { replace: true }); break;
            default:
              navigate("/registro", { replace: true });
          }
        } else {
          navigate("/registro", { replace: true });
        }
      } catch (error) {
        console.error("❌ Error en verificación:", error);
        navigate("/registro", { replace: true });
      }
    };

    verificar();
  }, [isReady, isAuthenticated, principalId, actor]);
}
