#!/bin/bash
set -e

echo "🔍 Validando archivos index.js de declarations..."

FILES=$(find ./src/declarations -name "index.js")

ERROR=0

for file in $FILES; do
  if grep -E '\{\}\.CANISTER_ID|ICP\s*-' "$file"; then
    echo "❌ Error detectado en: $file"
    ERROR=1
  else
    echo "✅ OK: $file"
  fi
done

if [ "$ERROR" -eq 1 ]; then
  echo "🚫 Validación fallida. Corrige los errores antes de hacer deploy."
  exit 1
else
  echo "🎯 Validación completada sin errores."
fi
