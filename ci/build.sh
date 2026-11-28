#!/usr/bin/env bash
set -euo pipefail
NODE="${1:-20}"
TAG="${2:-local}"
mkdir -p artifacts
LOG="artifacts/build-node${NODE}.log"

{
  echo ">>> Build Node ${NODE} (tag ${TAG}) - $(date)"
  docker build --build-arg NODE_VERSION="${NODE}" -t "bookstore-api:${TAG}-node${NODE}" backend
  docker build --build-arg NODE_VERSION="${NODE}" -t "bookstore-web:${TAG}-node${NODE}" frontend
  echo ">>> Build termine"
} 2>&1 | tee "$LOG"