#!/bin/bash
echo "🔧 Corrigiendo imports en .d.ts para usar .did.js"
for file in src/declarations/*/index.d.ts; do
  sed -i "s/\.did'/\.did.js'/g" "$file"
done
