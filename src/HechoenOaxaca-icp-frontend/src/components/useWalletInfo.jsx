// src/components/useWalletInfo.jsx
import { useEffect, useState } from "react";
import { useAuthContext } from "./authContext";
import { Principal } from "@dfinity/principal";

export function useWalletInfo() {
  const { isAuthenticated, principalId, actor, isLoading, rol } = useAuthContext();
  const [saldo, setSaldo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      if (!isAuthenticated || !principalId || !actor || !actor._service) {
        setLoading(false);
        return;
      }

      try {
        const p = Principal.fromText(principalId);
        const saldoRes = await actor.obtenerSaldo();
        setSaldo(saldoRes);
      } catch (err) {
        console.error("❌ Error obteniendo saldo de wallet:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletInfo();
  }, [isAuthenticated, principalId, actor]);

  return { principal: principalId, saldo, rol, loading: loading || isLoading };
}
