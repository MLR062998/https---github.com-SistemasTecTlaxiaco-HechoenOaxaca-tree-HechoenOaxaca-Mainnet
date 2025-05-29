#!/bin/bash
set -e

echo "🔧 Corrigiendo fallback directo de CANISTER_ID en index.js..."

for f in src/declarations/*/index.js; do
  if grep -q 'import.meta.env.VITE_CANISTER_ID_HECHOENOAXACA_ICP_' "$f"; then
    echo "✅ Ya corregido: $f"
  else
    sed -i 's|import.meta.env.VITE_CANISTER_ID_HECHOENOAXACA-ICP-\(.*\)|import.meta.env.VITE_CANISTER_ID_HECHOENOAXACA_ICP_\1|g' "$f"
    sed -i 's|import.meta.env.VITE_HECHOENOAXACA-ICP-\(.*\)_CANISTER_ID|import.meta.env.VITE_HECHOENOAXACA_ICP_\1_CANISTER_ID|g' "$f"
    echo "🛠️  Reparado: $f"
  fi
done

echo "✅ Fallback de CANISTER_ID reparado correctamente."
