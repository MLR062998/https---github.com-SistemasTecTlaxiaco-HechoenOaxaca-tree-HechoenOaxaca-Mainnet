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
      const nfid = await NFID.init({
        application: {
          name: "Proyecto Marketplace HeO",
          logo: "https://example.com/logo.png",
        },
      });

      const delegationIdentity = await nfid.getDelegation({
        maxTimeToLive: BigInt(8) * BigInt(3_600_000_000_000),
      });

      const principal = delegationIdentity.getPrincipal().toText();
      console.log("✅ Usuario autenticado con Principal:", principal);

      localStorage.setItem("principalId", principal);
      localStorage.setItem("identity", JSON.stringify(delegationIdentity.toJSON()));

      const agent = new HttpAgent({ identity: delegationIdentity });

      if (process.env.DFX_NETWORK === "local") {
        await agent.fetchRootKey();
      }

      const backendActor = Productos_backend.createActor(Productos_backend.canisterId, { agent });

      setUser({ principal });

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
      <button onClick={handleLogin} style={{ padding: "10px", fontSize: "16px" }} disabled={loading}>
        {loading ? "Cargando..." : "🚀 Login con NFID"}
      </button>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}

export default NfidLogin;
