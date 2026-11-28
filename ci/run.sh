#!/usr/bin/env bash
set -euo pipefail
NODE="${1:-20}"
TAG="${2:-local}"
ID="${TAG}-node${NODE}"
NET="bookstore-net-${ID}"

docker rm -f "api-${ID}" "web-${ID}" >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
docker network create "$NET"

docker run -d --name "api-${ID}" --network "$NET" \
  -e PORT=3000 \
  -e JWT_SECRET=ci-smoke-secret-0123456789-abcdefghijklmnop \
  "bookstore-api:${ID}"

docker run -d --name "web-${ID}" --network "$NET" "bookstore-web:${ID}"

echo ">>> Conteneurs api-${ID} et web-${ID} lances sur ${NET}"