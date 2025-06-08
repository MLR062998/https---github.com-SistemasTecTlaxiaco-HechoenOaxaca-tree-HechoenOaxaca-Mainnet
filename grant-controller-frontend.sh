#!/bin/bash

CANISTER="HechoenOaxaca-icp-frontend"
NETWORK="ic"

echo "🎯 Asignando control al identity actual para el canister $CANISTER..."

PRINCIPAL=$(dfx identity get-principal)
EXISTING_CONTROLLERS=$(dfx canister --network "$NETWORK" info "$CANISTER" | grep "Controllers" | grep "$PRINCIPAL")

if [ -n "$EXISTING_CONTROLLERS" ]; then
  echo "✅ Ya eres controller de $CANISTER: $PRINCIPAL"
else
  dfx canister --network "$NETWORK" update-settings \
    --add-controller "$PRINCIPAL" \
    "$CANISTER"
  echo "✅ Control agregado correctamente: $PRINCIPAL"
fi
