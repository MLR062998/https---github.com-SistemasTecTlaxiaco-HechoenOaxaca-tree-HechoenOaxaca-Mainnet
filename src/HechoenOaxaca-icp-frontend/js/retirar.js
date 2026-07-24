import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { HechoenOaxaca_icp_backend } from '../../../declarations/HechoenOaxaca-icp-backend';

document.getElementById('btnRetirar').addEventListener('click', async () => {
  const destino = document.getElementById('inputDestino').value.trim();
  const monto = Number(document.getElementById('inputMonto').value);

  if (!destino || isNaN(monto) || monto <= 0) {
    return toast.error("Verifica destino y monto");
  }

  const toastId = toast.loading("Procesando retiro...");

  try {
    const result = await HechoenOaxaca_icp_backend.retirarICP(destino, monto);
    if ('ok' in result) {
      toast.update(toastId, {
        render: "Transferencia enviada correctamente",
        type: "success",
        isLoading: false,
        autoClose: 5000
      });
    } else {
      toast.update(toastId, {
        render: result.err?.toString() || "Error desconocido",
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
    }
  } catch (err) {
    toast.update(toastId, {
      render: err.message || "Error en la red",
      type: "error",
      isLoading: false,
      autoClose: 5000
    });
  }
});