#!/bin/bash

# Lista de identidades locales
IDENTIDADES=$(dfx identity list | awk '{print $1}')

CANISTER=HechoenOaxaca-icp-backend
NETWORK=ic

echo "🔍 Buscando identidad con permisos de controller en: $CANISTER"

for ID in $IDENTIDADES; do
  echo ""
  echo "🔄 Probando identidad: $ID"
  dfx identity use "$ID" > /dev/null 2>&1

  PRINCIPAL=$(dfx identity get-principal)
  echo "👤 Principal: $PRINCIPAL"

  # Intentar obtener el estado del canister
  if dfx canister --network "$NETWORK" info "$CANISTER" > /dev/null 2>&1; then
    echo "✅ ¡$ID es controller de $CANISTER!"
    exit 0
  else
    echo "❌ $ID no tiene permisos de controller."
  fi
done

echo ""
echo "🚨 Ninguna identidad local parece ser controller del canister $CANISTER."
