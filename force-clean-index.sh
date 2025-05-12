
#!/bin/bash
set -e
FILES=("src/declarations/HechoenOaxaca-icp-backend/index.js")
for f in "${FILES[@]}"; do
  sed -i "/process.env.*HECHOENOAXACA-ICP-BACKEND/d" "$f"
done
echo "✅ Limpieza de líneas inválidas aplicada"

