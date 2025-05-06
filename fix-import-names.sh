nano fix-import-names.sh
#!/bin/bash

echo "🔍 Buscando y reemplazando imports incorrectos..."

# Ruta base del proyecto
BASE_DIR="./src"

# Buscar y reemplazar en todos los archivos de código fuente
find "$BASE_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/\bHechoenOaxaca_icp_backend\b/HechoenOaxacaIcpBackend/g' {} +

echo "✅ Todos los imports fueron corregidos exitosamente."

