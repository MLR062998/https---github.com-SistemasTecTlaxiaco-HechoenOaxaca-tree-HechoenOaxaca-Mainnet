#!/bin/bash

ROLLUP_NATIVE="node_modules/rollup/dist/native.js"

echo "🛠️ Eliminando Rollup nativo conflictivo si existe..."
if [ -f "$ROLLUP_NATIVE" ]; then
  rm "$ROLLUP_NATIVE"
  echo "✅ Archivo eliminado: $ROLLUP_NATIVE"
else
  echo "ℹ️ No se encontró: $ROLLUP_NATIVE"
fi

echo "📦 Verificando instalación..."
find node_modules/rollup -name native.js && echo "❌ AÚN PRESENTE" || echo "✅ NATIVO LIMPIO"
