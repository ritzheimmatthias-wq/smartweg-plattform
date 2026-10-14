#!/usr/bin/env bash
# Richtet smartWEG auf einem frischen Linux-Server ein (getestet für Ubuntu 24.04).
# Aufruf als root:  bash install.sh [domain]
#
# Läuft auf dem Server schon Traefik (etwa neben n8n), meldet sich smartWEG dort an und
# übernimmt dessen Netz und Zertifikatsverfahren. Sonst kommt Caddy für HTTPS dazu.
# Ohne Domain: mit Traefik eine sslip.io-Adresse, die auf die IP des Servers zeigt
# (z. B. smartweg.187-127-83-108.sslip.io), ohne Traefik der Hostname des Servers.
set -euo pipefail

REPO="${SMARTWEG_REPO:-https://github.com/ritzheimmatthias-wq/smartweg-plattform.git}"
ZWEIG="${SMARTWEG_ZWEIG:-main}"
ZIEL="/opt/smartweg"

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte als root ausführen." >&2
  exit 1
fi

# Laufenden Traefik-Container suchen und seine Einstellungen auslesen.
TRAEFIK=""
if command -v docker >/dev/null 2>&1; then
  TRAEFIK="$(docker ps --format '{{.Names}} {{.Image}}' | awk '$2 ~ /(^|\/)traefik(:|$)/ {print $1; exit}')"
fi
if [ -n "$TRAEFIK" ]; then
  ARGS="$(docker inspect "$TRAEFIK" --format '{{range .Config.Cmd}}{{println .}}{{end}}')"
  TRAEFIK_RESOLVER="$(printf '%s\n' "$ARGS" | sed -n 's/^--certificatesresolvers\.\([^.]*\)\..*/\1/p' | head -n1)"
  TRAEFIK_ENTRYPOINT="$(printf '%s\n' "$ARGS" | sed -n 's/^--entrypoints\.\([^.]*\)\.address=:443$/\1/p' | head -n1)"
  # Das Netz, über das Traefik die übrigen Dienste erreicht.
  TRAEFIK_NETZ="$(docker ps -q --filter label=traefik.enable=true | xargs -r docker inspect --format '{{index .Config.Labels "traefik.docker.network"}}' | grep -v '^$' | head -n1 || true)"
  if [ -z "$TRAEFIK_RESOLVER" ] || [ -z "$TRAEFIK_ENTRYPOINT" ] || [ -z "$TRAEFIK_NETZ" ]; then
    echo "Traefik ($TRAEFIK) gefunden, aber Netz, Einstiegspunkt oder Zertifikatsverfahren nicht erkannt." >&2
    echo "Netz: '$TRAEFIK_NETZ'  Einstiegspunkt: '$TRAEFIK_ENTRYPOINT'  Verfahren: '$TRAEFIK_RESOLVER'" >&2
    exit 1
  fi
  IP="$(ip route get 1.1.1.1 | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}')"
  DOMAIN="${1:-smartweg.${IP//./-}.sslip.io}"
  echo "Traefik gefunden ($TRAEFIK): Netz $TRAEFIK_NETZ, Einstiegspunkt $TRAEFIK_ENTRYPOINT, Zertifikate über $TRAEFIK_RESOLVER"
else
  DOMAIN="${1:-$(hostname -f)}"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker wird installiert ..."
  curl -fsSL https://get.docker.com | sh
fi
command -v git >/dev/null 2>&1 || { apt-get update -q && apt-get install -yq git; }

if [ -d "$ZIEL/.git" ]; then
  git -C "$ZIEL" fetch -q origin "$ZWEIG"
  git -C "$ZIEL" reset -q --hard "origin/$ZWEIG"
else
  git clone -q --branch "$ZWEIG" "$REPO" "$ZIEL"
fi

# .env nur beim ersten Mal anlegen, damit spätere Anpassungen (z. B. SMTP) erhalten bleiben.
if [ ! -f "$ZIEL/.env" ]; then
  if [ -n "$TRAEFIK" ]; then
    PROXY="COMPOSE_FILE=docker-compose.yml:deploy/traefik.yml
TRAEFIK_NETZ=$TRAEFIK_NETZ
TRAEFIK_ENTRYPOINT=$TRAEFIK_ENTRYPOINT
TRAEFIK_RESOLVER=$TRAEFIK_RESOLVER"
  else
    PROXY="COMPOSE_FILE=docker-compose.yml:deploy/caddy.yml"
  fi
  cat > "$ZIEL/.env" <<ENV
$PROXY
DOMAIN=$DOMAIN
SMARTWEG_URL=https://$DOMAIN
# Für den echten E-Mail-Versand ausfüllen und danach: cd $ZIEL && docker compose up -d
SMTP_URL=
SMTP_ABSENDER=
ENV
  chmod 600 "$ZIEL/.env"
fi

chmod +x "$ZIEL/deploy/update.sh" "$ZIEL/deploy/sicherung.sh"
cat > /etc/cron.d/smartweg <<CRON
# smartWEG: alle 5 Minuten neue Version aus GitHub holen, nachts sichern
*/5 * * * * root $ZIEL/deploy/update.sh >> /var/log/smartweg-update.log 2>&1
30 3 * * * root $ZIEL/deploy/sicherung.sh >> /var/log/smartweg-sicherung.log 2>&1
CRON

cd "$ZIEL"
docker compose up -d --build

echo
echo "smartWEG läuft unter https://$(grep '^DOMAIN=' .env | cut -d= -f2)"
echo "Das HTTPS-Zertifikat wird beim ersten Aufruf geholt, das kann eine Minute dauern."
