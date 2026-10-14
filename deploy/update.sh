#!/usr/bin/env bash
# Holt neue Versionen aus GitHub (main) und startet smartWEG neu, wenn sich etwas geändert hat.
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/var/lock/smartweg-update.lock
flock -n 9 || exit 0

git fetch -q origin main
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then
  exit 0
fi
echo "$(date -Is) Neue Version $(git rev-parse --short origin/main)"
git reset -q --hard origin/main
docker compose up -d --build
docker image prune -f >/dev/null
