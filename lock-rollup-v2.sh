#!/bin/bash

echo "📌 Protegiendo versión de rollup: forzando la 2.x"

# Bloquea versiones indeseadas en overrides
npx json -I -f package.json -e 'this.overrides = this.overrides || {}; this.overrides["rollup"] = "2.70.1"'

# Si usas yarn
if [ -f yarn.lock ]; then
  echo "🔒 Sugerencia: usa también 'resolutions' si usas yarn"
  npx json -I -f package.json -e 'this.resolutions = this.resolutions || {}; this.resolutions["rollup"] = "2.70.1"'
fi

echo "✅ Configuración aplicada. Ejecuta nuevamente 'npm install' para aplicar override."
