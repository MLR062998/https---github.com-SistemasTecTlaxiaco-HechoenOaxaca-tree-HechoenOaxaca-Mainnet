#!/bin/bash

# === CONFIGURA TU PRINCIPAL CONTROLADOR DEL CANISTER ===
CONTROLADOR_OBJETIVO="ey6ow-joiln-qdis4-xmxll-5jrzo-4e7mn-22zj7-wywqe-evnoz-l3kef-lqe"
CANISTER_NAME="HechoenOaxaca-icp-backend"

echo "🔍 Buscando identidad con principal: $CONTROLADOR_OBJETIVO"

for IDENTIDAD in $(dfx identity list); do
  echo "🔄 Probar identidad: $IDENTIDAD"
  dfx identity use "$IDENTIDAD" >/dev/null

  PRINCIPAL_ACTUAL=$(dfx identity get-principal)
  if [[ "$PRINCIPAL_ACTUAL" == "$CONTROLADOR_OBJETIVO" ]]; then
    echo "✅ Coincidencia encontrada: $IDENTIDAD ($PRINCIPAL_ACTUAL)"
    echo "🚀 Desplegando $CANISTER_NAME en mainnet..."
    dfx deploy "$CANISTER_NAME" --network ic
    exit 0
  fi
done

echo "❌ No se encontró una identidad que controle el canister."
exit 1
