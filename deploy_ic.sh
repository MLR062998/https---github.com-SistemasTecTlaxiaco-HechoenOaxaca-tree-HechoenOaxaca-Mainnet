#!/bin/bash
set -e

echo "🚀 Iniciando despliegue en mainnet (network: ic)..."

# Validar acceso opcional a icp-api.io (puede fallar sin impedir el deploy)
echo "🔍 (Opcional) Verificando acceso a https://icp-api.io ..."
if ! curl -s --head https://icp-api.io | head -n 1 | grep "200 OK" > /dev/null; then
  echo "⚠️  Aviso: ICP API no respondió. Continuando de todas formas..."
fi

# Compilar proyecto
echo "🛠️ Ejecutando build de frontend..."
if ! npm run build; then
  echo "❌ Error al construir el frontend."
  exit 1
fi

# Reemplazar canisterId por valores hardcoded
echo "🔁 Aplicando fix de canisterId hardcoded post-build..."
./fix-canister-hardcode.sh

# Desplegar todos los canisters a mainnet
echo "📦 Desplegando canisters en mainnet..."
if ! dfx deploy --network ic --no-wallet --verbose; then
  echo "❌ Falló el despliegue. Revisa los logs anteriores."
  exit 1
fi

# Confirmación final
echo "✅ Despliegue completado con éxito en red principal."
echo "🌐 Verifica tu frontend en: https://$(dfx canister --network ic id HechoenOaxaca-icp-frontend).icp0.io"

