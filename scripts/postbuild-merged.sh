#!/bin/bash
set -e

echo "🔧 Iniciando script postbuild unificado..."

# 🧼 1. Buscar y limpiar el JS final
DIST_JS=$(find . -path "*/dist/assets/index-*.js" | grep -vE '\.map$' | head -n 1)

if [[ -f "$DIST_JS" ]]; then
  echo "📦 Archivo index encontrado: $DIST_JS"

  if grep -q "ICP - BACKEND" "$DIST_JS"; then
    echo "❌ Eliminando línea corrupta en $DIST_JS..."
    sed -i '/ICP - BACKEND/d' "$DIST_JS"
    echo "✅ Línea eliminada."
  else
    echo "✅ No se encontró código roto en $DIST_JS."
  fi
else
  echo "❌ No se encontró archivo index-*.js en dist/"
fi

# 🛠️ 2. Parchear archivos de declaración
echo "🔧 Parcheando CANISTER_ID y createActor..."

FILES=(
  "src/declarations/HechoenOaxaca-icp-backend/index.js"
  "src/declarations/HechoenOaxaca-icp-frontend/index.js"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "🛠️ Procesando $file..."

    # Elimina imports rotos
    sed -i '/import.meta.env.VITE_CANISTER_ID_HECHOENOAXACA-ICP-/d' "$file"
    sed -i '/import.meta.env.VITE_HECHOENOAXACA-ICP-/d' "$file"

    # Verifica canisterId hardcoded
    grep -q 'export const canisterId = "' "$file" || \
      echo "⚠️ No se encontró canisterId hardcoded en $file, revisa manualmente"

    # Solo para backend
    if [[ "$file" == *"backend"* ]]; then
      echo "🔧 Parcheando createActor para Connect2IC en $file..."

      sed -i 's/export const createActor = (canisterId, options = {})/export const createActor = (options = {})/' "$file"
      sed -i 's/canisterId, canisterId/canisterId/g' "$file"
      grep -q 'canisterId,' "$file" || \
        sed -i '0,/return Actor.createActor(idlFactory, {/s//return Actor.createActor(idlFactory, { canisterId,/' "$file"
      grep -q "HechoenOaxacaIcpBackend" "$file" || \
        echo 'export const HechoenOaxacaIcpBackend = createActor();' >> "$file"

      echo "✅ createActor parchado correctamente"
    fi

    echo "✅ Archivo corregido: $file"
  else
    echo "❌ Archivo no encontrado: $file"
  fi
done

echo "🎯 Reparación completa ✅"
