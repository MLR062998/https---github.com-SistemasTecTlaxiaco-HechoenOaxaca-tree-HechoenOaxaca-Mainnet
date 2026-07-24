// src/lib/actors/hechoenOaxacaActor.js

import { idlFactory, canisterId } from "declarations/HechoenOaxaca-icp-backend";
import { Actor, HttpAgent } from "@dfinity/agent";

/**
 * Este createActor es compatible con Connect2IC:
 * - Recibe { canisterId, agent, actorOptions }
 */
export const createActor = ({ canisterId, agent, actorOptions = {} }) => {
  return Actor.createActor(idlFactory, {
    agent: agent || new HttpAgent(),
    canisterId,
    ...actorOptions,
  });
};

export { canisterId };
