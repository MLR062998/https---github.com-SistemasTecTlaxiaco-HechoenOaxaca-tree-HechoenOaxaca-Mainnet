#!/bin/bash

echo "🔍 Verificando rollup/dist/native.js..."
ROLLUP_NATIVE="node_modules/rollup/dist/native.js"

if [ -f "$ROLLUP_NATIVE" ]; then
  echo "ℹ️ Encontrado: $ROLLUP_NATIVE"
  grep -q 'Dummy .*ejecutado' "$ROLLUP_NATIVE" && echo "✅ Dummy activo" || echo "⚠️ Archivo no parcheado"
else
  echo "✅ native.js NO existe. Correcto."
fi
