#!/bin/bash
set -e

echo "🔧 Corrigiendo fallback directo de CANISTER_ID en index.js..."

for f in src/declarations/*/index.js; do
  if grep -q 'process.env.CANISTER_ID_HECHOENOAXACA_ICP_' "$f"; then
    echo "✅ Ya corregido: $f"
  else
    sed -i 's|process.env.CANISTER_ID_HECHOENOAXACA-ICP-\(.*\)|process.env.CANISTER_ID_HECHOENOAXACA_ICP_\1|g' "$f"
    sed -i 's|process.env.HECHOENOAXACA-ICP-\(.*\)_CANISTER_ID|process.env.HECHOENOAXACA_ICP_\1_CANISTER_ID|g' "$f"
    echo "🛠️  Reparado: $f"
  fi
done

echo "✅ Fallback de CANISTER_ID reparado correctamente."
