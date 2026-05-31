#!/usr/bin/env bash
# Construye la imagen Docker de POSVet que levantan los clientes.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE="${POSVET_IMAGE:-posvet:latest}"
echo "Construyendo $IMAGE…"
docker build -t "$IMAGE" .
echo "Listo: $IMAGE"
