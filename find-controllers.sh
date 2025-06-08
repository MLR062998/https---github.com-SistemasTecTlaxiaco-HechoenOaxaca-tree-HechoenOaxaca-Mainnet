#!/bin/bash

# Lista de canisters a comprobar
CANISTERS=("HechoenOaxaca-icp-backend" "HechoenOaxaca-icp-frontend")

# Lista de identidades locales
IDENTS=$(dfx identity list)

for CANISTER in "${CANISTERS[@]}"; do
  echo -e "\n🔍 Buscando controller válido para: $CANISTER"

  for ID in $IDENTS; do
    echo "🔄 Probando identidad: $ID"
    dfx identity use "$ID" &>/dev/null
    PRINCIPAL=$(dfx identity get-principal)
    echo "👤 Principal: $PRINCIPAL"

    if dfx canister --network ic info "$CANISTER" 2>&1 | grep -q "$PRINCIPAL"; then
      echo "✅ ¡$ID es controller del canister $CANISTER!"
    else
      echo "❌ $ID no tiene permisos sobre $CANISTER"
    fi
  done
done
