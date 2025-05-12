#!/bin/bash
set -e
echo "🔍 Buscando usos inválidos de createActor()..."
grep -r --include="*.js" --include="*.ts" "createActor(" src/ | grep -vE "createActor\\([\\\"\x27][a-z0-9\\-]+[\\\"\x27]" || true
echo "✅ Análisis completado. Si no hubo resultados arriba, todos los usos son válidos."
