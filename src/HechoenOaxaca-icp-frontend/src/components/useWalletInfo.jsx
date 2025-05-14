// ✅ src/hooks/useWalletInfo.js
import { useEffect, useState } from "react";
import { useConnect } from "@connect2ic/react";
import { Principal } from "@dfinity/principal";
import { createActor, canisterId } from "declarations/HechoenOaxaca-icp-backend";

export function useWalletInfo() {
  const { isConnected, principal, activeProvider } = useConnect();
  const [saldo, setSaldo] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      if (!isConnected || !principal || !activeProvider?.identity) return;

      try {
        const actor = createActor(canisterId, {
          agentOptions: { identity: activeProvider.identity },
        });

        const p = Principal.fromText(principal);
        const s = await actor.obtenerSaldo();
        const r = await actor.getRolUsuario(p);

        setSaldo(s);
        setRol(r);
        localStorage.setItem("rol", r); // opcional: guarda rol globalmente
      } catch (err) {
        console.error("❌ Error obteniendo info de wallet:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletInfo();
  }, [isConnected, principal, activeProvider?.identity]);

  return { principal, saldo, rol, loading };
}
