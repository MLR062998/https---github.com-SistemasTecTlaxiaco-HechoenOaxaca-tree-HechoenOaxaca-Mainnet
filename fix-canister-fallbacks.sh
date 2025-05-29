#!/bin/bash
set -e

echo "🔧 Corrigiendo fallback directo y nullish de import.meta.env.VITE_CANISTER_ID en index.js..."

FILES=$(find src/declarations -name index.js)

for file in $FILES; do
  # Fallback backend
  if grep -q 'import.meta.env.VITE_CANISTER_ID_HECHOENOAXACA_ICP_BACKEND' "$file"; then
    sed -i \
      -e 's|process.env\["CANISTER_ID_HECHOENOAXACA_ICP_BACKEND"\] \|\| process.env\["HECHOENOAXACA_ICP_BACKEND_CANISTER_ID"\]|process.env["CANISTER_ID_HECHOENOAXACA_ICP_BACKEND"] || process.env["HECHOENOAXACA_ICP_BACKEND_CANISTER_ID"] || "cqup7-hqaaa-aaaai-q3wca-cai"|' \
      "$file"
    echo "✅ Backend corregido: $file"
  fi

  # Fallback frontend
  if grep -q 'import.meta.env.VITE_CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND' "$file"; then
    sed -i \
      -e 's|process.env\["CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND"\] \|\| process.env\["HECHOENOAXACA_ICP_FRONTEND_CANISTER_ID"\]|process.env["CANISTER_ID_HECHOENOAXACA_ICP_FRONTEND"] || process.env["HECHOENOAXACA_ICP_FRONTEND_CANISTER_ID"] || "cxvjl-kiaaa-aaaai-q3wcq-cai"|' \
      "$file"
    echo "✅ Frontend corregido: $file"
  fi
done

echo "🏁 Listo: fallback de CANISTER_ID insertado correctamente."

