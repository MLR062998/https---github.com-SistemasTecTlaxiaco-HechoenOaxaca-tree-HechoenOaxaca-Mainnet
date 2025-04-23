// src/auth.ts
import { useEffect } from "react";
import { useConnect } from "@connect2ic/react";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "react-router-dom";
import { HechoenOaxaca_icp_backend } from "declarations/HechoenOaxaca-icp-backend";

export function useAuthFlow() {
  const { isConnected, principal, activeProvider } = useConnect();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      if (!isConnected || !principal) return;

      const p = Principal.fromText(principal);
      console.log("🔍 Verificando usuario:", p.toText());

      try {
        const usuarioExiste = await HechoenOaxaca_icp_backend.verificarUsuario(p);

        if (!usuarioExiste) {
          console.log("📝 Registrando nuevo usuario...");
          await HechoenOaxaca_icp_backend.registrarUsuario();
        }

        const rol = await HechoenOaxaca_icp_backend.getRolUsuario(p);
        console.log("🔑 Rol del usuario:", rol);

        if (rol && typeof rol === "string" && rol !== "NoAsignado") {
          navigate(`/${rol.toLowerCase()}-dashboard`);
        } else {
          navigate("/registro");
        }
      } catch (error) {
        console.error("❌ Error autenticando/obteniendo rol:", error);
        alert("⚠️ No se pudo autenticar. Revisa consola.");
      }
    };

    handleAuth();
  }, [isConnected, principal, navigate]);
}
