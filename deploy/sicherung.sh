#!/usr/bin/env bash
# Nächtliche Sicherung der Datenbank. smartWEG hält dafür wenige Sekunden an,
# damit die Dateien in sich stimmig sind. Aufbewahrt werden 14 Sicherungen.
set -euo pipefail
cd "$(dirname "$0")/.."
ORDNER="${SMARTWEG_SICHERUNGEN:-/opt/smartweg-sicherungen}"
mkdir -p "$ORDNER"
DATEI="$ORDNER/smartweg-$(date +%F).tar.gz"

docker compose stop app
trap 'docker compose start app' EXIT
docker compose run --rm --no-deps -v "$ORDNER":/ziel --entrypoint tar app czf "/ziel/$(basename "$DATEI")" -C /data .
echo "$(date -Is) Sicherung $DATEI"
ls -1t "$ORDNER"/smartweg-*.tar.gz | tail -n +15 | xargs -r rm --
