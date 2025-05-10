#!/bin/bash
set -e

echo "🔧 Reemplazando todos los process.env.* por el valor string hardcoded..."

# backend
sed -i 's|export const canisterId =.*|export const canisterId = "cqup7-hqaaa-aaaai-q3wca-cai";|' src/declarations/HechoenOaxaca-icp-backend/index.js

# frontend
sed -i 's|export const canisterId =.*|export const canisterId = "cxvjl-kiaaa-aaaai-q3wcq-cai";|' src/declarations/HechoenOaxaca-icp-frontend/index.js

echo "✅ Reemplazo directo completo."
