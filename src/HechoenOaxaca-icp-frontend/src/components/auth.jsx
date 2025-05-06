// src/auth.ts
import { useEffect } from "react";
import { useConnect } from "@connect2ic/react";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "react-router-dom";
import { HechoenOaxacaIcpBackend } from "declarations/HechoenOaxaca-icp-backend";

export function useAuthFlow() {
  const { isConnected, principal, activeProvider } = useConnect();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      if (!isConnected || !principal) return;

      const p = Principal.fromText(principal);
      console.log("🔍 Verificando usuario:", p.toText());

      try {
        const usuarioExiste = await HechoenOaxacaIcpBackend.verificarUsuario(p);

        if (!usuarioExiste) {
          console.log("📝 Registrando nuevo usuario...");
          await HechoenOaxacaIcpBackend.registrarUsuario();
        }

        const rol = await HechoenOaxacaIcpBackend.getRolUsuario(p);
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
