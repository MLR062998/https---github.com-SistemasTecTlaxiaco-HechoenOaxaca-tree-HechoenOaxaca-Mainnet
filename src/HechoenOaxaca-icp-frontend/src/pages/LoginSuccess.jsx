import { useEffect } from "react";
import { useAuthContext } from "../components/authContext";
import { useNavigate } from "react-router-dom";
import VerificandoUsuario from "../components/VerificandoUsuario";
import { handleActorError } from "../utils/handleActorError";

export default function LoginSuccess() {
  const { actor, logout, authState } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      authState.status !== "authenticated" ||
      !actor ||
      typeof actor?.obtenerUsuario !== "function"
    ) {
      console.log("⏳ LoginSuccess esperando actor válido y autenticación...");
      return;
    }

    const check = async () => {
      try {
        const res = await actor.obtenerUsuario();
        if ("ok" in res) {
          const rol = Object.keys(res.ok.rol)[0];
          localStorage.setItem("rol", rol);
          navigate(`/${rol.toLowerCase()}-dashboard`, { replace: true });
        } else {
          navigate("/registro", { replace: true });
        }
      } catch (err) {
        const handled = await handleActorError(err, logout);
        if (!handled) {
          console.error("❌ Fallo en LoginSuccess:", err);
          navigate("/registro", { replace: true });
        }
      }
    };

    check();
  }, [actor, authState.status, logout, navigate]);

  return <VerificandoUsuario />;
}
