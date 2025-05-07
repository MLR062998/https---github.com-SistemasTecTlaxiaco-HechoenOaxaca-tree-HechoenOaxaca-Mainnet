#!/bin/bash
set -e

echo "📦 1. Quitando configuración remota del canister en dfx.json (sed)..."

# Limpia cualquier configuración 'remote' para evitar conflictos de despliegue local
sed -i '/"remote": {/,/},/d' dfx.json

echo "👤 2. Obteniendo tu principal actual..."
PRINCIPAL=$(dfx identity get-principal)
echo "   → Principal: $PRINCIPAL"

echo "🛠️ 3. Reinstalando backend con argumento initialAdmin..."
dfx deploy HechoenOaxaca-icp-backend --network ic --no-wallet --argument "principal \"$PRINCIPAL\""

echo "🎨 4. Reinstalando frontend..."
dfx deploy HechoenOaxaca-icp-frontend --network ic --no-wallet

echo "✅ Canisters desplegados correctamente."
