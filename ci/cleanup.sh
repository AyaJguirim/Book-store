#!/usr/bin/env bash
NODE="${1:-20}"
TAG="${2:-local}"
ID="${TAG}-node${NODE}"
NET="bookstore-net-${ID}"
mkdir -p artifacts

docker logs "api-${ID}" > "artifacts/api-node${NODE}.log" 2>&1 || true
docker logs "web-${ID}" > "artifacts/web-node${NODE}.log" 2>&1 || true
docker rm -f "api-${ID}" "web-${ID}" >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
echo ">>> Nettoyage termine"
exit 0