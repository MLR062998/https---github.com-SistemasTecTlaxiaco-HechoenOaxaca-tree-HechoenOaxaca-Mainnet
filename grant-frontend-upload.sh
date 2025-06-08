#!/bin/bash
set -e

echo "🔐 Cambiando a identidad: nfid-identity"
dfx identity use nfid-identity

PRINCIPAL=$(dfx identity get-principal)
echo "👤 Agregando permisos de Prepare a: $PRINCIPAL en HechoenOaxaca-icp-frontend ..."

dfx canister --network ic call HechoenOaxaca-icp-frontend grant_permission \
  "(record { to_principal = principal \"$PRINCIPAL\"; permission = variant { Prepare } })"
