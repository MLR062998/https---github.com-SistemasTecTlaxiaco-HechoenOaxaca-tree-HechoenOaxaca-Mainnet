import { useEffect, useState } from "react";
import { useConnect } from "@connect2ic/react";
import { Principal } from "@dfinity/principal";
import { HechoenOaxaca_icp_backend } from "declarations/HechoenOaxaca-icp-backend";

export function useWalletInfo() {
  const { isConnected, principal } = useConnect();
  const [saldo, setSaldo] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      if (!isConnected || !principal) return;

      try {
        const p = Principal.fromText(principal);
        const s = await HechoenOaxaca_icp_backend.obtenerSaldo();
        const r = await HechoenOaxaca_icp_backend.getRolUsuario(p);

        setSaldo(s);
        setRol(r);
      } catch (err) {
        console.error("❌ Error obteniendo info de wallet:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletInfo();
  }, [isConnected, principal]);

  return { principal, saldo, rol, loading };
}
