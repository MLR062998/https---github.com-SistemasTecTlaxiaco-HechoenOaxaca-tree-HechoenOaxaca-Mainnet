#!/bin/bash

set -e

echo "🚀 Desplegando en la red principal (ic)..."
echo "========================================="

PRINCIPAL=$(dfx identity get-principal)
echo "👤 Usando identidad: $PRINCIPAL"

WALLET_ID=$(dfx identity get-wallet --network ic 2>/dev/null || echo "No wallet definido")
echo "Red Wallet ID: $WALLET_ID"
echo ""

# Verificar permisos sin bloquearse si no tienes acceso
for CANISTER in HechoenOaxaca-icp-backend HechoenOaxaca-icp-frontend; do
  echo "🔍 Verificando permisos sobre $CANISTER ..."
  INFO=$(dfx canister --network ic info "$CANISTER" 2>&1 || true)
  if echo "$INFO" | grep -q "$PRINCIPAL"; then
    echo "✅ Tienes permisos sobre $CANISTER"
  else
    echo "⛔ ERROR: Tu identidad no es controller de $CANISTER. Abortando despliegue."
    exit 1
  fi
done

# Desplegar
dfx deploy --network ic --upgrade-unchanged

FRONTEND_ID=$(dfx canister id HechoenOaxaca-icp-frontend --network ic)
BACKEND_ID=$(dfx canister id HechoenOaxaca-icp-backend --network ic)

echo ""
echo "✅ Despliegue completado con éxito:"
echo "🌐 Frontend: https://${FRONTEND_ID}.ic0.app"
echo "🔧 Backend ID: ${BACKEND_ID}"
