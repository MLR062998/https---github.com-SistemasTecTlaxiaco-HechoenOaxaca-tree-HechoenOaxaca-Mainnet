#!/bin/bash
set -e

DIST_JS="dist/assets/index.js"

if grep -q "ICP - BACKEND" "$DIST_JS"; then
  echo "❌ Eliminando línea corrupta en $DIST_JS..."
  sed -i '/ICP - BACKEND/d' "$DIST_JS"
  echo "✅ Línea corrupta eliminada."
else
  echo "✅ No se encontró código roto en $DIST_JS."
fi
