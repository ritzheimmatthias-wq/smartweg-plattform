# smartWEG Plattform

Software für selbstverwaltete Wohnungseigentümergemeinschaften (WEG): Versammlung, Abstimmung und Beschlusssammlung in einem System. Später kommen Eigentümerportal, Dokumente, Hausgeld und Jahresabrechnung dazu.

## Stand

Ausbaustufe für das Paket „Selbstverwalter“:

- **Konten:** registrieren, anmelden, abmelden. Passwörter werden mit scrypt gehasht, die Sitzung liegt in einem httpOnly-Cookie (30 Tage), in der Datenbank nur als Hash.
- **Eigene WEGs:** jede Gemeinschaft legt ihre WEG mit Einheiten, MEA und Eigentümern an. Wer die WEG anlegt, verwaltet sie.
- **Zugriff für Eigentümer:** wer sich mit der E-Mail-Adresse registriert, die bei einem Eigentümer hinterlegt ist, sieht diese WEG automatisch mit Lesezugriff. Fremde WEGs sind nicht erreichbar (404).
- **Übersicht:** Einheiten, Eigentümer, Miteigentumsanteile, Stimmrechtsprinzip
- **Versammlungen:** planen, Einladungsfrist nach § 24 Abs. 4 WEG prüfen (3 Wochen ab Zugang, Brief mit 3 Tagen Laufzeit), Versand vermerken, Tagesordnung anlegen
- **Abstimmung:** Stimmen je Einheit erfassen und nach Kopf-, Objekt- oder Wertprinzip zählen (§ 25 WEG), einfache oder qualifizierte Mehrheit (§ 21 Abs. 2 Nr. 1 WEG)
- **Beschlusssammlung:** verkündete Beschlüsse werden fortlaufend nummeriert mit Wortlaut, Ort und Datum eingetragen (§ 24 Abs. 7 WEG)

Noch nicht enthalten: Passwort zurücksetzen, E-Mail-Bestätigung, Versand von Einladungen, Online-Teilnahme, Dokumente, Buchhaltung.

## Starten

```bash
npm install
npm run dev
```

Dann http://localhost:3000 öffnen. Die Datenbank (PGlite, ein eingebettetes Postgres) liegt unter `.data/pglite` und wird beim ersten Start mit der Beispiel-WEG „Lindenstraße 12“ gefüllt (6 Einheiten, 1.000 MEA, alle Namen erfunden). Auf der Anmeldeseite öffnet „Beispiel ansehen“ diese WEG ohne Passwort; `SMARTWEG_BEISPIEL=aus` schaltet das ab. Zum Zurücksetzen den Ordner löschen. `SMARTWEG_DATA_DIR=memory://` hält alles im Arbeitsspeicher.

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
