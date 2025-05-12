#!/bin/bash
set -e
echo "🧹 Sanitizando index.js en declarations..."

FILES=(
  "src/declarations/HechoenOaxaca-icp-backend/index.js"
  "src/declarations/HechoenOaxaca-icp-frontend/index.js"
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    # Elimina cualquier línea con guiones malformados o fragmentos rotos
    sed -i '/ICP\s*[-]\s*BACKEND/d' "$f"
    sed -i '/ICP\s*[-]\s*FRONTEND/d' "$f"
    sed -i '/CANISTER_ID.*process\.env.*[-]/d' "$f"
    sed -i '/{}\s*[-]\s*/d' "$f"
    echo "✅ Limpio: $f"
  fi
done

echo "🎯 Limpieza finalizada correctamente."
