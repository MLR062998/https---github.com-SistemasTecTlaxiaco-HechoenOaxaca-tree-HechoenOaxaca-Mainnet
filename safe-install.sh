#!/bin/bash

echo "🧹 Limpiando node_modules, locks, cache..."
rm -rf node_modules package-lock.json package-lock.lock .npm .cache

echo "🧼 Limpiando cache profunda de npm..."
npm cache clean --force

echo "🛡️ Forzando npm sin módulos nativos..."
echo "optional=false" > .npmrc

echo "📦 Instalando rollup@2.70.1 + vite@4.5.2 sin opcionales..."
npm install --save-dev rollup@2.70.1 vite@4.5.2 --legacy-peer-deps --no-optional

echo "🔍 Verificando que native.js NO exista..."
if find node_modules/rollup -name native.js | grep -q native.js; then
  echo "❌ AÚN PRESENTE: El rollup nativo sigue ahí. Abortando build..."
  exit 1
else
  echo "✅ NATIVO LIMPIO: todo en orden."
fi

echo "🚀 Ejecutando build final..."
npm run build
