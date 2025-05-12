#!/bin/bash
set -e

echo "🔧 Aplicando fallback directo a CANISTER_ID en index.js..."

FILES=(
  "src/declarations/HechoenOaxaca-icp-backend/index.js"
  "src/declarations/HechoenOaxaca-icp-frontend/index.js"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    # Elimina líneas rotas de env
    sed -i '/process.env.CANISTER_ID_HECHOENOAXACA-ICP-/d' "$file"
    sed -i '/process.env.HECHOENOAXACA-ICP-/d' "$file"

    # Verifica que canisterId hardcoded esté
    grep -q 'export const canisterId = "' "$file" || {
      echo "⚠️ No se encontró canisterId hardcoded en $file, revisa manualmente"
    }

    echo "✅ Archivo corregido: $file"
  else
    echo "❌ Archivo no encontrado: $file"
  fi
done

echo "🎯 Reparación postbuild aplicada con éxito."
