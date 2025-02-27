import { useState, useContext } from "react";
import { NFID } from "@nfid/embed";
import { HttpAgent } from "@dfinity/agent";
import { AuthContext } from "./authContext";
import * as Productos_backend from "declarations/HechoenOaxaca-icp-backend"; // ✅ Import correcto

function NfidLogin() {
  const { setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
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

      const agent = new HttpAgent({ identity: delegationIdentity });
      if (process.env.DFX_NETWORK === "local") {
        agent.fetchRootKey();
      }

      // ✅ Usar el actor con el agente autenticado
      const backendActor = Productos_backend.createActor(Productos_backend.canisterId, { agent });

      const principal = delegationIdentity.getPrincipal().toText();
      setUser({ principal });

      // 🔹 Llamar a una función del canister
      const usuario = await backendActor.obtenerPerfil(principal);
      console.log("Perfil del usuario:", usuario);

    } catch (error) {
      console.error("Error en la autenticación:", error);
    }
    setLoading(false);
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button onClick={handleLogin} style={{ padding: "10px", fontSize: "16px" }}>
        🚀 Login con NFID
      </button>
      {loading && <p>Cargando...</p>}
    </div>
  );
}

export default NfidLogin;
