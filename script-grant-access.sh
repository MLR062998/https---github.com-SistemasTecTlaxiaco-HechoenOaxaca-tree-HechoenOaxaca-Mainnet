#!/bin/bash

# Nombre del canister
CANISTERS=("HechoenOaxaca-icp-backend" "HechoenOaxaca-icp-frontend")
NETWORK="ic"
NEW_CONTROLLER="5yfxf-cgp2u-57c7q-cb2t7-kpass-sbwaa-6urz5-wmwq2-efhhn-az5cw-lqe"

# Cambiar a la identidad que tiene permisos
echo "🔐 Usando identidad nfid-identity (debe tener permisos de controller)"
dfx identity use nfid-identity

for CANISTER in "${CANISTERS[@]}"; do
  echo "🚀 Agregando nuevo controller a $CANISTER ..."
  dfx canister --network $NETWORK update-settings \
    --add-controller "$NEW_CONTROLLER" \
    "$CANISTER"
done

echo "✅ Todos los permisos han sido actualizados correctamente."
