import { useState, useContext } from "react";
import { NFID } from "@nfid/embed";
import { HttpAgent } from "@dfinity/agent";
import { AuthContext } from "./authContext";  // ✅ Import corregido
import * as Productos_backend from "declarations/HechoenOaxaca-icp-backend";

function NfidLogin() {
  const { setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");

    try {
      // Inicializar NFID
      const nfid = await NFID.init({
        application: {
          name: "Proyecto Marketplace HeO",
          logo: "https://example.com/logo.png",
        },
      });

      // Obtener la identidad delegada
      const delegationIdentity = await nfid.getDelegation({
        maxTimeToLive: BigInt(8) * BigInt(3_600_000_000_000), // 8 horas
      });

      // Obtener el Principal del usuario
      const principal = delegationIdentity.getPrincipal().toText();
      console.log("✅ Usuario autenticado con Principal:", principal);

      // Almacenar el Principal y la identidad en localStorage
      localStorage.setItem("principalId", principal);
      localStorage.setItem("identity", JSON.stringify(delegationIdentity.toJSON()));

      // Crear un agente HTTP con la identidad delegada
      const agent = new HttpAgent({ identity: delegationIdentity });

      // Obtener la clave raíz en desarrollo (entorno local)
      if (process.env.DFX_NETWORK === "local") {
        await agent.fetchRootKey();
      }

      // Crear el actor del backend usando el agente
      const backendActor = Productos_backend.createActor(Productos_backend.canisterId, { agent });

      // Actualizar el estado del usuario con el Principal
      setUser({ principal });

      // Obtener el perfil del usuario desde el backend
      const usuario = await backendActor.obtenerPerfil(principal);
      console.log("📌 Perfil del usuario:", usuario);

    } catch (error) {
      console.error("❌ Error en la autenticación:", error);
      setError("Error al iniciar sesión con NFID. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={handleLogin}
        style={{ padding: "10px", fontSize: "16px" }}
        disabled={loading}
      >
        {loading ? "Cargando..." : "🚀 Login con NFID"}
      </button>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}

export default NfidLogin;