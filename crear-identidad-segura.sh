#!/bin/bash

IDENTITY_NAME="deployer"

echo "🔐 Creando identidad segura: $IDENTITY_NAME..."
dfx identity new $IDENTITY_NAME

echo "📌 Cambiando a la nueva identidad..."
dfx identity use $IDENTITY_NAME

echo "👤 Principal de la nueva identidad:"
dfx identity get-principal
