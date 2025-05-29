#!/bin/bash
echo "🔧 Reemplazando 'process.env' por 'import.meta.env' en todo el proyecto..."

# Buscar todos los archivos JS/TS/TSX y reemplazar process.env por import.meta.env
grep -rl --exclude-dir=node_modules --exclude-dir=.dfx --exclude-dir=dist "process.env." . | while read -r file; do
  echo "⚙️ Corrigiendo: $file"
  sed -i 's/process\.env\.\([A-Z_][A-Z0-9_]*\)/import.meta.env.VITE_\1/g' "$file"
done

echo "✅ Reemplazo completado. Ahora puedes ejecutar 'npm run build' y luego 'dfx deploy --network ic'"
