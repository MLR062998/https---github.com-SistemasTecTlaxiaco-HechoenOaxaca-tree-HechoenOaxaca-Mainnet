#!/bin/bash
set -e

echo "🔧 Eliminando líneas con nombres incorrectos de variables de entorno (con guiones)..."

FILES=(
  "src/declarations/HechoenOaxaca-icp-backend/index.js"
  "src/declarations/HechoenOaxaca-icp-frontend/index.js"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    sed -i \
      -e '/process\.env\.CANISTER_ID_HECHOENOAXACA-ICP-BACKEND/d' \
      -e '/process\.env\.HECHOENOAXACA-ICP-BACKEND_CANISTER_ID/d' \
      -e '/process\.env\.CANISTER_ID_HECHOENOAXACA-ICP-FRONTEND/d' \
      -e '/process\.env\.HECHOENOAXACA-ICP-FRONTEND_CANISTER_ID/d' \
      "$file"
    echo "✅ Limpieza aplicada: $file"
  else
    echo "⚠️ No encontrado: $file"
  fi
done

echo "🎯 Limpieza completa. Se eliminaron referencias inválidas de process.env con guiones."
