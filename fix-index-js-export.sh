#!/bin/bash

echo "🔧 Corrigiendo export en index.js para nombres válidos..."

# Ruta base
BASE_DIR="src/declarations"
CANISTERS=("HechoenOaxaca-icp-backend" "HechoenOaxaca-icp-frontend")

for canister in "${CANISTERS[@]}"; do
  JS_FILE="$BASE_DIR/$canister/index.js"

  if [[ -f "$JS_FILE" ]]; then
    echo "✔️  Procesando $JS_FILE..."

    # Generar nombre válido en PascalCase sin guiones
    exportName=$(echo "$canister" | sed 's/-//g' | sed -E 's/(^|_)([a-z])/\U\2/g')

    # Eliminar export inválido y agregar export válido
    sed -i "/export const .* = createActor(canisterId);/d" "$JS_FILE"
    echo "export const $exportName = createActor(canisterId);" >> "$JS_FILE"
  else
    echo "⚠️  No se encontró: $JS_FILE"
  fi
done

echo "✅ Exports corregidos correctamente en index.js."

