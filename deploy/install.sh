#!/usr/bin/env bash
# Richtet smartWEG auf einem frischen Linux-Server ein (getestet für Ubuntu 24.04).
# Aufruf als root:  bash install.sh [domain]
# Ohne Domain wird der Hostname des Servers verwendet (bei Hostinger z. B. srv123456.hstgr.cloud).
set -euo pipefail

REPO="https://github.com/ritzheimmatthias-wq/smartweg-plattform.git"
ZIEL="/opt/smartweg"
DOMAIN="${1:-$(hostname -f)}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte als root ausführen." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker wird installiert ..."
  curl -fsSL https://get.docker.com | sh
fi
command -v git >/dev/null 2>&1 || { apt-get update -q && apt-get install -yq git; }

if [ -d "$ZIEL/.git" ]; then
  git -C "$ZIEL" fetch -q origin main
  git -C "$ZIEL" reset -q --hard origin/main
else
  git clone -q --branch main "$REPO" "$ZIEL"
fi

# .env nur beim ersten Mal anlegen, damit spätere Anpassungen (z. B. SMTP) erhalten bleiben.
if [ ! -f "$ZIEL/.env" ]; then
  cat > "$ZIEL/.env" <<ENV
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
echo "smartWEG läuft unter https://$DOMAIN"
echo "Das HTTPS-Zertifikat holt Caddy beim ersten Aufruf, das kann eine Minute dauern."
