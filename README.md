# smartWEG Plattform

Software für selbstverwaltete Wohnungseigentümergemeinschaften (WEG): Versammlung, Abstimmung und Beschlusssammlung in einem System. Später kommen Eigentümerportal, Dokumente, Hausgeld und Jahresabrechnung dazu.

## Stand

Ausbaustufe für das Paket „Selbstverwalter“:

- **Konten:** registrieren, anmelden, abmelden. Passwörter werden mit scrypt gehasht, die Sitzung liegt in einem httpOnly-Cookie (30 Tage), in der Datenbank nur als Hash.
- **Eigene WEGs:** jede Gemeinschaft legt ihre WEG mit Einheiten, MEA und Eigentümern an. Wer die WEG anlegt, verwaltet sie.
- **Zugriff für Eigentümer:** wer sich mit der E-Mail-Adresse registriert, die bei einem Eigentümer hinterlegt ist, sieht diese WEG automatisch mit Lesezugriff. Fremde WEGs sind nicht erreichbar (404).
- **Übersicht:** Einheiten, Eigentümer, Miteigentumsanteile, Stimmrechtsprinzip
- **Versammlungen:** planen, Tagesordnung anlegen, Einladungsfrist nach § 24 Abs. 4 WEG prüfen (3 Wochen ab Zugang, Brief mit 3 Tagen Laufzeit)
- **Einladung per E-Mail:** ein Klick lädt alle Eigentümer mit Tagesordnung und Beschlussanträgen ein. Eigentümer ohne E-Mail-Adresse bekommen einen Brief zum Ausdrucken, dessen Versand vermerkt wird. Ein Link in der Einladung lässt Eigentümer den Empfang bestätigen.
- **Fristnachweis:** für jeden Eigentümer Versandweg, Versandzeit, rechnerischer Zugang, Vorlauf in Tagen und Empfangsbestätigung, samt versandtem Text. Als Seite zum Drucken oder Speichern als PDF.
- **Abstimmung:** Stimmen je Einheit erfassen und nach Kopf-, Objekt- oder Wertprinzip zählen (§ 25 WEG), einfache oder qualifizierte Mehrheit (§ 21 Abs. 2 Nr. 1 WEG)
- **Beschlusssammlung:** verkündete Beschlüsse werden fortlaufend nummeriert mit Wortlaut, Ort und Datum eingetragen (§ 24 Abs. 7 WEG)

Noch nicht enthalten: Passwort zurücksetzen, E-Mail-Bestätigung bei der Registrierung, Online-Teilnahme, Dokumente, Buchhaltung.

## Starten

```bash
npm install
npm run dev
```

Dann http://localhost:3000 öffnen. Die Datenbank (PGlite, ein eingebettetes Postgres) liegt unter `.data/pglite` und wird beim ersten Start mit der Beispiel-WEG „Lindenstraße 12“ gefüllt (6 Einheiten, 1.000 MEA, alle Namen erfunden). Auf der Anmeldeseite öffnet „Beispiel ansehen“ diese WEG ohne Passwort; `SMARTWEG_BEISPIEL=aus` schaltet das ab. Zum Zurücksetzen den Ordner löschen. `SMARTWEG_DATA_DIR=memory://` hält alles im Arbeitsspeicher.

### E-Mail-Versand

Ohne Mailserver läuft smartWEG im Testmodus: Einladungen werden erstellt und gespeichert, aber nicht verschickt. Für echten Versand:

| Variable | Beispiel |
| --- | --- |
| `SMTP_URL` | `smtps://benutzer:passwort@mail.example.de:465` |
| `SMTP_ABSENDER` | `smartWEG <einladung@smartweg.de>` |
| `SMARTWEG_URL` | `https://app.smartweg.de` (für den Bestätigungslink; sonst aus der Anfrage) |

Antworten auf eine Einladung gehen an die E-Mail-Adresse der Verwaltung. Die Beispiel-WEG verschickt nie echte E-Mails.

## Betrieb

smartWEG läuft auf einem eigenen Linux-Server, zum Beispiel einem Hostinger-VPS mit Ubuntu 24.04. `docker-compose.yml` startet zwei Dienste:
- die App aus dem `Dockerfile`, mit der Datenbank in einem Docker-Volume
- Caddy, das HTTPS-Zertifikate selbst holt

Einrichtung, einmal als root auf dem Server:

```bash
curl -fsSL https://raw.githubusercontent.com/ritzheimmatthias-wq/smartweg-plattform/main/deploy/install.sh | bash -s -- meine-domain.de
```

Ohne Domain nimmt das Skript den Hostnamen des Servers, bei Hostinger etwa `srv123456.hstgr.cloud`. Eine eigene Domain braucht einen DNS-Eintrag (A-Record) auf die IP des Servers.

Danach läuft alles von selbst:

| Was | Wie |
| --- | --- |
| Neue Versionen | `deploy/update.sh` prüft alle 5 Minuten, ob es auf `main` Neues gibt, und baut dann neu. |
| Sicherung | `deploy/sicherung.sh` sichert die Datenbank jede Nacht um 3:30 Uhr nach `/opt/smartweg-sicherungen` und behält 14 Stände. |
| Einstellungen | `/opt/smartweg/.env`: Domain und SMTP für den E-Mail-Versand. Nach Änderungen `cd /opt/smartweg && docker compose up -d`. |

Protokolle stehen in `/var/log/smartweg-update.log` und `/var/log/smartweg-sicherung.log`.

## Prüfen

```bash
npm run typecheck
npm test
npm run build
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/domain` | WEG-Regeln ohne Datenbank und Oberfläche: Stimmenzählung, Fristen, Beschlusssammlung, Konten, Stammdaten. Hier liegen die Tests. |
| `src/db` | Datenbankschema (Drizzle), Migration, Beispieldaten |
| `src/lib` | Anmeldung und Rollen (`auth.ts`), Datenzugriff, Server-Aktionen |
| `src/app/weg/[wegId]` | Seiten einer WEG, nur für ihre Mitglieder |
| `src/app` | Seiten (Next.js App Router) |

Technik: Next.js 15, React 19, TypeScript, Drizzle ORM, PGlite für Entwicklung und Tests. Für den Betrieb ist ein Postgres-Server in Deutschland vorgesehen; das Schema bleibt dasselbe.
