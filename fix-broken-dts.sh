#!/bin/bash

echo "🔧 Corrigiendo archivos index.d.ts..."

BASE_DIR="src/declarations"
CANISTERS=("HechoenOaxaca-icp-backend" "HechoenOaxaca-icp-frontend")

# Fix .d.ts
for canister in "${CANISTERS[@]}"; do
  DTS_FILE="$BASE_DIR/$canister/index.d.ts"
  if [[ -f "$DTS_FILE" ]]; then
    echo "✔️  Procesando $DTS_FILE..."
    sed -i '/export declare const .*: ActorSubclass<.*>;/d' "$DTS_FILE"
  else
    echo "⚠️  No se encontró: $DTS_FILE"
  fi
done

echo "🔧 Corrigiendo nombre de export en index.js..."

# Fix .js
for canister in "${CANISTERS[@]}"; do
  JS_FILE="$BASE_DIR/$canister/index.js"
  if [[ -f "$JS_FILE" ]]; then
    echo "✔️  Procesando $JS_FILE..."

    # Construir nombre sin guiones y en PascalCase
    cleaned_name=$(echo "$canister" | sed -E 's/(^|-)([a-z])/\U\2/g')

    # Eliminar línea inválida
    sed -i '/export const .* = createActor(canisterId);/d' "$JS_FILE"

    # Agregar línea válida al final
    echo "export const $cleaned_name = createActor(canisterId);" >> "$JS_FILE"
  else
    echo "⚠️  No se encontró: $JS_FILE"
  fi
done

echo "✅ Archivos corregidos correctamente."
