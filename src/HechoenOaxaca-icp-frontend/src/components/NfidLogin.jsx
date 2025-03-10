import { useState, useContext } from "react";
import { NFID } from "@nfid/embed";
import { HttpAgent } from "@dfinity/agent";
import { AuthContext } from "./authContext";
import * as Productos_backend from "declarations/HechoenOaxaca-icp-backend"; // ✅ Import correcto

function NfidLogin() {
  const { setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // ✅ Manejo de errores

  async function handleLogin() {
    setLoading(true);
    setError(""); // Limpiar errores previos

    try {
      // ✅ Inicializar NFID
      const nfid = await NFID.init({
        application: {
          name: "Proyecto Marketplace HeO",
          logo: "https://example.com/logo.png", // Asegúrate de que esta URL sea válida
        },
      });

      // ✅ Obtener la identidad delegada
      const delegationIdentity = await nfid.getDelegation({
        maxTimeToLive: BigInt(8) * BigInt(3_600_000_000_000), // 8 horas de validez
      });

      const principal = delegationIdentity.getPrincipal().toText();
      console.log("✅ Usuario autenticado con Principal:", principal);

      // ✅ Guardar identidad en localStorage
      localStorage.setItem("principalId", principal);
      localStorage.setItem("identity", JSON.stringify(delegationIdentity.toJSON()));

      // ✅ Crear el agente HTTP autenticado
      const agent = new HttpAgent({ identity: delegationIdentity });

      // ✅ Obtener la clave raíz en desarrollo local
      if (process.env.DFX_NETWORK === "local") {
        await agent.fetchRootKey();
      }

      // ✅ Crear el actor autenticado
      const backendActor = Productos_backend.createActor(Productos_backend.canisterId, { agent });

      // ✅ Actualizar el estado del usuario
      setUser({ principal });

      // ✅ Obtener el perfil del usuario desde el canister
      const usuario = await backendActor.obtenerPerfil(principal);
      console.log("📌 Perfil del usuario:", usuario);

    } catch (error) {
      console.error("❌ Error en la autenticación:", error);
      setError("Error al iniciar sesión con NFID. Inténtalo de nuevo."); // Mostrar error al usuario
    } finally {
      setLoading(false); // Detener el estado de carga
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={handleLogin}
        style={{ padding: "10px", fontSize: "16px" }}
        disabled={loading} // Deshabilitar el botón durante la carga
      >
        {loading ? "Cargando..." : "🚀 Login con NFID"}
      </button>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>} {/* Mostrar errores */}
    </div>
  );
}

export default NfidLogin;