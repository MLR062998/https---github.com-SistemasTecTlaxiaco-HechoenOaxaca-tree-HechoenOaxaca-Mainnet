#!/bin/bash
set -e

echo "🔧 Aplicando fallback directo a CANISTER_ID en index.js..."

FILES=(
  "src/declarations/HechoenOaxaca-icp-backend/index.js"
  "src/declarations/HechoenOaxaca-icp-frontend/index.js"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    # 1. Limpia líneas rotas
    sed -i '/process.env.CANISTER_ID_HECHOENOAXACA-ICP-/d' "$file"
    sed -i '/process.env.HECHOENOAXACA-ICP-/d' "$file"

    # 2. Confirma que canisterId esté definido
    grep -q 'export const canisterId = "' "$file" || {
      echo "⚠️ No se encontró canisterId hardcoded en $file, revisa manualmente"
    }

    # 3. Parchea solo el backend
    if [[ "$file" == *"HechoenOaxaca-icp-backend"* ]]; then
      echo "🔧 Parcheando createActor para Connect2IC en $file..."

      # Corrige la firma de la función
      sed -i 's/export const createActor = (canisterId, options = {})/export const createActor = (options = {})/' "$file"

      # Limpia duplicados
      sed -i 's/canisterId, canisterId/canisterId/g' "$file"

      # Asegura que `canisterId` está presente en el retorno
      grep -q 'canisterId,' "$file" || \
        sed -i '0,/return Actor.createActor(idlFactory, {/s//return Actor.createActor(idlFactory, { canisterId,/' "$file"

      # Añade export directo si falta
      grep -q "HechoenOaxacaIcpBackend" "$file" || echo 'export const HechoenOaxacaIcpBackend = createActor();' >> "$file"

      echo "✅ createActor parchado correctamente"
    fi

    echo "✅ Archivo corregido: $file"
  else
    echo "❌ Archivo no encontrado: $file"
  fi
done

echo "🎯 Reparación postbuild aplicada con éxito."
