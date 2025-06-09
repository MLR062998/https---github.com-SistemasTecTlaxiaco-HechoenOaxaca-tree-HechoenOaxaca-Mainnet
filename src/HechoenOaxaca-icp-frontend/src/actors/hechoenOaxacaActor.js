// src/actors/hechoenOaxacaActor.js

import { createActor, canisterId } from "declarations/HechoenOaxaca-icp-backend";

/**
 * Retorna una instancia del actor para el canister HechoenOaxaca
 * con la identidad del proveedor activo.
 *
 * @param {import('@dfinity/agent').Identity} identity - Identidad del usuario conectado
 * @returns {import("../../../declarations/HechoenOaxaca-icp-backend")._SERVICE} actor
 */
export const getHechoenOaxacaActor = (identity) => {
  return createActor({
    canisterId,
    agentOptions: { identity },
  });
};
