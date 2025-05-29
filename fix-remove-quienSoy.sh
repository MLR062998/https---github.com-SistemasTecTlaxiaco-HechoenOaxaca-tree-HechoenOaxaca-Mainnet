#!/bin/bash

echo "🧹 Eliminando llamadas a quienSoy() en src/**/*.js y src/**/*.jsx..."

grep -rl 'quienSoy' ./src | while read -r file; do
  echo "→ Limpiando $file"
  sed -i '/quienSoy/d' "$file"
done

echo "✅ Limpieza completada: todas las líneas con 'quienSoy' fueron eliminadas."
