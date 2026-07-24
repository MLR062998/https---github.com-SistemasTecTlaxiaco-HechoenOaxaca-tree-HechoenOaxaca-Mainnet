import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";   // ✅ Importación correcta

const PagoQR = ({ pago, actor, onConfirmado }) => {
  const [estado, setEstado] = useState("⏳ Esperando pago...");
  const montoICP = (Number(pago.montoTotal) / 100_000_000).toFixed(8);
  const qrData = `icp://transfer?to=${pago.accountIdCanister}&amount=${montoICP}&memo=${pago.memo}`;

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!actor) return;
      try {
        const res = await actor.obtenerEstadoPago(pago.pagoId);
        if (res) {
          const estadoTexto = Object.keys(res)[0];
          if (estadoTexto === "pagado" || estadoTexto === "entregado") {
            setEstado("✅ Pago confirmado");
            if (onConfirmado) onConfirmado();
            clearInterval(interval);
          } else if (estadoTexto === "fallido" || estadoTexto === "expirado") {
            setEstado("❌ Pago fallido");
            clearInterval(interval);
          } else {
            setEstado("⏳ Esperando pago...");
          }
        }
      } catch (err) {
        console.error("Error consultando estado:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [actor, pago.pagoId, onConfirmado]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Escanea para pagar con ICP</h2>
      <QRCodeSVG value={qrData} size={256} />
      <p><strong>Monto:</strong> {montoICP} ICP</p>
      <p><strong>Memo:</strong> {pago.memo}</p>
      <p>{estado}</p>
      <p style={{ fontSize: "12px", color: "gray" }}>
        El pago se detecta automáticamente, no cierres esta ventana.
      </p>
      <small>Usa Plug, Stoic o NNS wallet</small>
    </div>
  );
};

export default PagoQR;