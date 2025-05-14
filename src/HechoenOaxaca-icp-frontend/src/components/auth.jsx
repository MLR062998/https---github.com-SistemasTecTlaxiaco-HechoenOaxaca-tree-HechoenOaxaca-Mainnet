import { useEffect } from "react";
import { useConnect } from "@connect2ic/react"; // Hook para manejar conexión/autenticación
import { Principal } from "@dfinity/principal"; // Utilidad para manejar IDs de usuarios en ICP
import { useNavigate } from "react-router-dom";
import { createActor, canisterId } from "declarations/HechoenOaxaca-icp-backend";

export function useAuthFlow() {
  const { isConnected, principal } = useConnect(); // Detecta si el usuario está conectado y su principal ID
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      if (!isConnected || !principal) return; // Si no está conectado, no continúa

      try {
        const actor = createActor(canisterId); // Crea una conexión con el canister backend
        const p = Principal.fromText(principal); // Convierte el principal en objeto ICP

        const usuarioExiste = await actor.verificarUsuario(p); // Verifica si el usuario ya está registrado
        if (!usuarioExiste) {
          await actor.registrarUsuario(); // Si no existe, lo registra en el backend
        }

        const rol = await actor.getRolUsuario(p); // Obtiene el rol del usuario desde el backend
        if (rol && typeof rol === "string" && rol !== "NoAsignado") {
          navigate(`/${rol.toLowerCase()}-dashboard`); // Redirige al dashboard según el rol
        } else {
          navigate("/registro"); // Si no tiene rol asignado, redirige a registro
        }
      } catch (error) {
        console.error("❌ Error autenticando usuario:", error);
        alert("⚠️ No se pudo autenticar. Verifica consola.");
      }
    };

    handleAuth();
  }, [isConnected, principal, navigate]); // Se ejecuta cada vez que cambia la conexión o el principal
}
