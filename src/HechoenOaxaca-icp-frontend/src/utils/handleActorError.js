// Maneja errores de firma inválida y fuerza logout limpio
export async function handleActorError(err, logoutCallback) {
    const message = `${err}`;
    const firmaInvalida =
      message.includes("Invalid signature") ||
      message.includes("verification failed") ||
      message.includes("AgentReadStateError");
  
    if (firmaInvalida) {
      console.warn("🔐 Firma inválida detectada. Reiniciando sesión...");
      if (typeof logoutCallback === "function") {
        await logoutCallback();
      } else {
        localStorage.clear();
        location.reload();
      }
      return true;
    }
  
    return false;
  }
  