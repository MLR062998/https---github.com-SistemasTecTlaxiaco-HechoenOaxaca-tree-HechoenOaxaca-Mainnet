#!/bin/bash
# fix-export-conflicts.sh
# Busca archivos .jsx sin export default y sugiere o corrige automáticamente

echo "🔍 Buscando archivos .jsx sin 'export default'..."

# Buscar archivos .jsx que no contengan 'export default'
FILES=$(grep -L 'export default' src/**/*.jsx)

for FILE in $FILES; do
  echo "⚠️  Falta export default en: $FILE"

  # Intentar encontrar nombre de componente React para exportarlo automáticamente
  COMPONENT_NAME=$(grep -Po 'function\s+\K\w+' "$FILE" | head -1)
  
  if [[ -n "$COMPONENT_NAME" ]]; then
    echo "🔧 Sugiriendo: export default $COMPONENT_NAME"
    echo "" >> "$FILE"
    echo "export default $COMPONENT_NAME;" >> "$FILE"
    echo "✅ Agregado export default $COMPONENT_NAME en $FILE"
  else
    echo "❌ No se pudo determinar el nombre del componente en $FILE"
  fi
done

echo "🎉 Revisión completa."

