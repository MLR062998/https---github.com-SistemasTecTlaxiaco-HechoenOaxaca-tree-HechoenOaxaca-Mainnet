#!/bin/bash
set -e

echo "🛠️ Aplicando fallback directo a CANISTER_ID en index.js..."

# Backend hardcoded
BACKEND_FILE="src/declarations/HechoenOaxaca-icp-backend/index.js"
if [ -f "$BACKEND_FILE" ]; then
  sed -i 's|export const canisterId =.*|export const canisterId = "cqup7-hqaaa-aaaai-q3wca-cai";|' "$BACKEND_FILE"
  echo "✅ Backend fijo: $BACKEND_FILE"
fi

# Frontend hardcoded
FRONTEND_FILE="src/declarations/HechoenOaxaca-icp-frontend/index.js"
if [ -f "$FRONTEND_FILE" ]; then
  sed -i 's|export const canisterId =.*|export const canisterId = "cxvjl-kiaaa-aaaai-q3wcq-cai";|' "$FRONTEND_FILE"
  echo "✅ Frontend fijo: $FRONTEND_FILE"
fi

echo "✅ CANISTER_ID hardcoded aplicado con éxito."
