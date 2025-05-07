#!/bin/bash
set -e

CANISTER_ID="cxvjl-kiaaa-aaaai-q3wcq-cai"

echo "📤 Subiendo assets estáticos a canister $CANISTER_ID..."

for file in $(find src/HechoenOaxaca-icp-frontend/dist -type f); do
  ASSET_PATH="${file#src/HechoenOaxaca-icp-frontend/dist}"
  echo "  → $ASSET_PATH"
  dfx canister --network ic call $CANISTER_ID store_asset "(record {
    key = \"$ASSET_PATH\";
    content_type = \"$(file --mime-type -b "$file")\";
    content_encoding = \"identity\";
    payload = blob \"$(base64 -w0 "$file")\";
  })"
done

echo "✅ Assets subidos manualmente."
