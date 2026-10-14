# smartWEG als Container: Next.js im Standalone-Modus, Daten (PGlite) im Volume unter /data.

FROM node:22-bookworm-slim AS bau
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Beim Bauen wird keine echte Datenbank gebraucht.
RUN SMARTWEG_DATA_DIR=memory:// npm run build

FROM node:22-bookworm-slim AS laufzeit
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    SMARTWEG_DATA_DIR=/data/pglite
COPY --from=bau /app/.next/standalone ./
COPY --from=bau /app/.next/static ./.next/static
# PGlite lädt WebAssembly- und Datendateien zur Laufzeit; das Paket kommt vollständig mit.
COPY --from=bau /app/node_modules/@electric-sql/pglite ./node_modules/@electric-sql/pglite
# Läuft als root, damit das vom Hoster eingehängte Volume ohne weitere Rechte beschreibbar ist.
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.js"]
