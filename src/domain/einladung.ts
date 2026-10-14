/**
 * Einladung zur Eigentümerversammlung: Empfänger, Text und Fristnachweis.
 *
 * Die Einladung braucht Textform (§ 24 Abs. 4 Satz 1 WEG), eine E-Mail genügt.
 * Die Frist läuft gegenüber jedem Eigentümer einzeln. Eingehalten ist sie erst,
 * wenn die Einladung jedem Eigentümer mindestens drei Wochen vor der
 * Versammlung zugegangen ist.
 */

import { EINLADUNGSFRIST_TAGE, pruefeEinladungsfrist, type Versandweg, zugangsdatum } from "./fristen";

export interface Eigentuemer {
  personId: string;
  name: string;
  email: string | null;
  einheiten: string[];
}

/** Fasst Eigentümer mehrerer Einheiten zusammen: jeder bekommt genau eine Einladung. */
export function empfaenger(
  einheiten: { bezeichnung: string; personen: { id: string; name: string; email: string | null }[] }[],
): Eigentuemer[] {
  const nachPerson = new Map<string, Eigentuemer>();
  for (const e of einheiten) {
    for (const p of e.personen) {
      const eintrag = nachPerson.get(p.id) ?? { personId: p.id, name: p.name, email: p.email?.trim() || null, einheiten: [] };
      eintrag.einheiten.push(e.bezeichnung);
      nachPerson.set(p.id, eintrag);
    }
  }
  return [...nachPerson.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export interface Einladungsdaten {
  wegName: string;
  wegAdresse: string;
  titel: string;
  datum: Date;
  uhrzeit: string;
  ort: string;
  onlineTeilnahme: boolean;
  tops: { nummer: number; titel: string; beschlussantrag: string }[];
  absender: string;
}

const langFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function einladungstext(d: Einladungsdaten, an: Eigentuemer, bestaetigungslink: string) {
  const betreff = `Einladung: ${d.titel} am ${langFormat.format(d.datum)}`;
  const zeilen = [
    `Guten Tag ${an.name},`,
    "",
    "hiermit lade ich Sie zur folgenden Eigentümerversammlung ein.",
    "",
    `Gemeinschaft: ${d.wegName}, ${d.wegAdresse}`,
    `${an.einheiten.length > 1 ? "Ihre Einheiten" : "Ihre Einheit"}: ${an.einheiten.join(", ")}`,
    "",
    `${d.titel}`,
    `${langFormat.format(d.datum)}, ${d.uhrzeit} Uhr`,
    `Ort: ${d.ort}`,
    ...(d.onlineTeilnahme ? ["Eine Teilnahme online ist möglich (§ 23 Abs. 1a WEG). Den Zugang erhalten Sie vor der Versammlung."] : []),
    "",
    "Tagesordnung",
    "",
    ...d.tops.flatMap((t) => [`TOP ${t.nummer}: ${t.titel}`, `Beschlussantrag: ${t.beschlussantrag}`, ""]),
    "Bitte bestätigen Sie den Empfang dieser Einladung mit einem Klick:",
    bestaetigungslink,
    "",
    "Wenn Sie nicht teilnehmen können, dürfen Sie sich in Textform vertreten lassen (§ 25 Abs. 3 WEG).",
    "",
    "Mit freundlichen Grüßen",
    d.absender,
  ];
  return { betreff, text: zeilen.join("\n") };
}

export interface Zustellung {
  personId: string;
  versandweg: Versandweg;
  /** Versanddatum; null, solange der Brief noch nicht verschickt ist. */
  versandtAm: Date | null;
}

export interface Fristnachweis {
  /** Alle Eigentümer eingeladen und die Frist gegenüber jedem eingehalten. */
  eingehalten: boolean;
  offen: number;
  unterschritten: number;
  /** Spätester rechnerischer Zugang über alle Eigentümer. */
  letzterZugang: Date | null;
  /** Kürzester Vorlauf in Tagen über alle Eigentümer. */
  kuerzesterVorlauf: number | null;
}

export function fristnachweis(versammlung: Date, zustellungen: Zustellung[], anzahlEigentuemer: number): Fristnachweis {
  let offen = Math.max(0, anzahlEigentuemer - zustellungen.length);
  let unterschritten = 0;
  let letzterZugang: Date | null = null;
  let kuerzesterVorlauf: number | null = null;
  for (const z of zustellungen) {
    if (!z.versandtAm) {
      offen++;
      continue;
    }
    const p = pruefeEinladungsfrist(versammlung, z.versandtAm, z.versandweg);
    if (!p.eingehalten) unterschritten++;
    const zugang = zugangsdatum(z.versandtAm, z.versandweg);
    if (!letzterZugang || zugang > letzterZugang) letzterZugang = zugang;
    if (kuerzesterVorlauf === null || p.tageVorlauf < kuerzesterVorlauf) kuerzesterVorlauf = p.tageVorlauf;
  }
  return {
    eingehalten: offen === 0 && unterschritten === 0 && zustellungen.length > 0,
    offen,
    unterschritten,
    letzterZugang,
    kuerzesterVorlauf,
  };
}

export { EINLADUNGSFRIST_TAGE };
