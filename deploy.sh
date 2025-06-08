#!/bin/bash

# Salir si ocurre cualquier error
set -e

echo "🚀 Desplegando en la red principal (ic)..."
echo "========================================="

# Mostrar el Wallet ID en la red ic
WALLET_ID=$(dfx identity get-wallet --network ic 2>/dev/null || echo "No wallet definido")
echo "Red Wallet ID: $WALLET_ID"
echo ""

# Compilar y desplegar en la red principal (ic)
dfx deploy --network ic --upgrade-unchanged

# Mostrar URLs de los canisters desplegados
FRONTEND_ID=$(dfx canister id HechoenOaxaca-icp-frontend --network ic)
BACKEND_ID=$(dfx canister id HechoenOaxaca-icp-backend --network ic)

echo ""
echo "✅ Despliegue completado con éxito en Mainnet:"
echo ""
echo "🌐 Frontend:"
echo "  https://${FRONTEND_ID}.ic0.app"
echo ""
echo "🔧 Backend Canister ID:"
echo "  ${BACKEND_ID}"
