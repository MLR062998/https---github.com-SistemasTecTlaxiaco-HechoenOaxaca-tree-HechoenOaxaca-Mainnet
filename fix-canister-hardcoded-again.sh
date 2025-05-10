#!/bin/bash
set -e

echo "🔁 Aplicando hardcoded manual a canisterId en index.js..."

# Backend
BACKEND_FILE="src/declarations/HechoenOaxaca-icp-backend/index.js"
if [ -f "$BACKEND_FILE" ]; then
  sed -i 's|export const canisterId =.*|export const canisterId = "cqup7-hqaaa-aaaai-q3wca-cai";|' "$BACKEND_FILE"
  echo "✅ Backend corregido: $BACKEND_FILE"
fi

# Frontend
FRONTEND_FILE="src/declarations/HechoenOaxaca-icp-frontend/index.js"
if [ -f "$FRONTEND_FILE" ]; then
  sed -i 's|export const canisterId =.*|export const canisterId = "cxvjl-kiaaa-aaaai-q3wcq-cai";|' "$FRONTEND_FILE"
  echo "✅ Frontend corregido: $FRONTEND_FILE"
fi

echo "🎯 Hardcoded canisterId aplicado correctamente."
