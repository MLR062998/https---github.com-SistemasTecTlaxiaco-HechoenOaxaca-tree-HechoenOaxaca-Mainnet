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

echo "⬇️ Forzando downgrade a vite 4 + plugin-react compatible..."
npm install vite@4.4.9 @vitejs/plugin-react@4.0.3 --save-dev

echo "✅ Instalación completada."

echo "🔍 Verificando conflictos comunes..."
if grep -r "from '../../native.js'" node_modules/rollup/ 2>/dev/null; then
  echo "❌ Aún hay referencias a '../../native.js'"
else
  echo "✅ No se encontraron referencias incorrectas a native.js"
fi

echo "🚀 Ejecuta ahora: npm run build"
