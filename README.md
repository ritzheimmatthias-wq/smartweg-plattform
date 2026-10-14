# smartWEG Plattform

Software für selbstverwaltete Wohnungseigentümergemeinschaften (WEG): Versammlung, Abstimmung und Beschlusssammlung in einem System. Später kommen Eigentümerportal, Dokumente, Hausgeld und Jahresabrechnung dazu.

## Stand

Erste Ausbaustufe für das Paket „Selbstverwalter“, mit der Beispiel-Gemeinschaft „Lindenstraße 12“ (6 Einheiten, 1.000 MEA, alle Namen erfunden):

- **Übersicht:** Einheiten, Eigentümer, Miteigentumsanteile, Stimmrechtsprinzip
- **Versammlungen:** planen, Einladungsfrist nach § 24 Abs. 4 WEG prüfen (3 Wochen ab Zugang, Brief mit 3 Tagen Laufzeit), Versand vermerken, Tagesordnung anlegen
- **Abstimmung:** Stimmen je Einheit erfassen und nach Kopf-, Objekt- oder Wertprinzip zählen (§ 25 WEG), einfache oder qualifizierte Mehrheit (§ 21 Abs. 2 Nr. 1 WEG)
- **Beschlusssammlung:** verkündete Beschlüsse werden fortlaufend nummeriert mit Wortlaut, Ort und Datum eingetragen (§ 24 Abs. 7 WEG)

Noch nicht enthalten: Anmeldung und mehrere WEGs, Versand von Einladungen, Online-Teilnahme, Dokumente, Buchhaltung.

## Starten

```bash
npm install
npm run dev
```

Dann http://localhost:3000 öffnen. Die Datenbank (PGlite, ein eingebettetes Postgres) liegt unter `.data/pglite` und wird beim ersten Start mit der Beispiel-WEG gefüllt. Zum Zurücksetzen den Ordner löschen. `SMARTWEG_DATA_DIR=memory://` hält alles im Arbeitsspeicher.

## Prüfen

```bash
npm run typecheck
npm test
npm run build
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/domain` | WEG-Regeln ohne Datenbank und Oberfläche: Stimmenzählung, Fristen, Beschlusssammlung. Hier liegen die Tests. |
| `src/db` | Datenbankschema (Drizzle), Migration, Beispieldaten |
| `src/lib` | Datenzugriff und Server-Aktionen |
| `src/app` | Seiten (Next.js App Router) |

Technik: Next.js 15, React 19, TypeScript, Drizzle ORM, PGlite für Entwicklung und Tests. Für den Betrieb ist ein Postgres-Server in Deutschland vorgesehen; das Schema bleibt dasselbe.
