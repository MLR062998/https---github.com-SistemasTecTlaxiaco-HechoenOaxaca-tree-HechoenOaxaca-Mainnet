#!/bin/bash

echo "🧹 Limpiando node_modules, dist y cachés..."

rm -rf \
  node_modules/ \
  package-lock.json \
  dist/ \
  src/HechoenOaxaca-icp-frontend/node_modules/ \
  src/HechoenOaxaca-icp-frontend/.vite \
  ~/.npm/_cacache \
  ~/.vite

echo "✅ Cachés eliminados."
echo "📦 Instalando dependencias con --legacy-peer-deps..."
npm install --legacy-peer-deps

echo "⬇️ Forzando downgrade de rollup@2.79.1..."
npm install rollup@2.79.1 --save-dev

echo "✅ Instalación completa."
echo "🔍 Verificando que no exista ninguna referencia a '../../native.js'..."

if grep -r "from '../../native.js'" node_modules/rollup/; then
  echo "❌ Aún hay referencias a '../../native.js'"
else
  echo "✅ No se encontraron referencias incorrectas a native.js"
fi

echo "🚀 Listo. Ejecuta ahora: npm run build"
