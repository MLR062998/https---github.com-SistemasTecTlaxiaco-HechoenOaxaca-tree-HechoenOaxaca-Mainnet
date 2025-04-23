#!/bin/bash

echo "🧹 Limpiando node_modules y locks..."
rm -rf node_modules package-lock.json package-lock.lock .npm .cache

echo "🛡️ Forzando configuración limpia con Rollup 2.x y Vite estable..."
npx json -I -f package.json -e 'this.overrides = {
  "rollup": "2.70.1",
  "vite": "4.5.2",
  "vite-plugin-environment": "1.0.3",
  "vitest": "0.34.6"
 }'
npx json -I -f package.json -e 'this.resolutions = { "rollup": "2.70.1" }'

echo "📦 Instalando dependencias limpias sin nativos..."
npm install --legacy-peer-deps --no-optional

echo "🔧 Parcheando rollup/dist/native.js..."
node scripts/patch-rollup-native.cjs

echo "🚀 Compilando proyecto final..."
npm run build
