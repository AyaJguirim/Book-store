#!/usr/bin/env bash
NODE="${1:-20}"
TAG="${2:-local}"
ID="${TAG}-node${NODE}"
NET="bookstore-net-${ID}"
HEALTH_PATH="/api/health"
mkdir -p artifacts
RESULT="artifacts/smoke_result_node${NODE}.txt"
FAILS=0

# Requete HTTP depuis un conteneur du meme reseau (wget est dans l'image API)
probe() { docker run --rm --network "$NET" --entrypoint wget "bookstore-api:${ID}" "$@"; }
pass() { echo "[OK] $1"; }
fail() { echo "[KO] $1"; FAILS=$((FAILS+1)); }

{
  echo "Smoke test Node ${NODE} - $(date)"

  # attente du demarrage de l'API (30 s max)
  for i in $(seq 1 30); do
    probe -qO- "http://api-${ID}:3000${HEALTH_PATH}" >/dev/null 2>&1 && break
    sleep 1
  done

  # 1. conteneur API actif
  if [ "$(docker inspect -f '{{.State.Running}}' "api-${ID}" 2>/dev/null)" = "true" ]; then
    pass "1/4 conteneur API actif"; else fail "1/4 conteneur API actif"; fi

  # 2. route health de l'API
  if probe -qO- "http://api-${ID}:3000${HEALTH_PATH}" 2>/dev/null | grep -q '"status":"ok"'; then
    pass "2/4 API ${HEALTH_PATH} repond ok"; else fail "2/4 API ${HEALTH_PATH} repond ok"; fi

  # 3. page d'accueil du front
  if probe -qO- "http://web-${ID}/" 2>/dev/null | grep -qi "<div id=\"root\""; then
    pass "3/4 front / sert l'application"; else fail "3/4 front / sert l'application"; fi

  # 4. fallback SPA de nginx
  if probe -qO- "http://web-${ID}/connexion" >/dev/null 2>&1; then
    pass "4/4 front /connexion (fallback SPA)"; else fail "4/4 front /connexion (fallback SPA)"; fi

  if [ "$FAILS" -eq 0 ]; then echo "RESULT: PASSED"; else echo "RESULT: FAILED"; fi
} 2>&1 | tee "$RESULT"

[ "$FAILS" -eq 0 ]