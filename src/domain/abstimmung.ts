/**
 * Stimmenzählung nach WEG.
 *
 * Gesetzlicher Regelfall ist das Kopfprinzip (§ 25 Abs. 2 WEG): Jeder
 * Wohnungseigentümer hat eine Stimme, unabhängig von der Zahl seiner Einheiten.
 * Mehrere Berechtigte einer Einheit stimmen einheitlich ab. Die
 * Gemeinschaftsordnung kann stattdessen das Objektprinzip (eine Stimme je
 * Einheit) oder das Wertprinzip (nach Miteigentumsanteilen, MEA) vorsehen.
 *
 * Ein Beschluss braucht die Mehrheit der abgegebenen Stimmen (§ 25 Abs. 1 WEG).
 * Enthaltungen zählen nicht als abgegebene Stimmen.
 */

export type Stimmrechtsprinzip = "kopf" | "objekt" | "mea";
export type Stimmwert = "ja" | "nein" | "enthaltung";

export type Mehrheit =
  /** Mehr Ja- als Nein-Stimmen (§ 25 Abs. 1 WEG). */
  | "einfach"
  /**
   * Mehr als zwei Drittel der abgegebenen Stimmen und mehr als die Hälfte aller
   * MEA, etwa damit eine bauliche Veränderung alle Eigentümer zahlen lässt
   * (§ 21 Abs. 2 Satz 1 Nr. 1 WEG).
   */
  | "zweiDrittelUndHalbeMea";

export interface Einheit {
  id: string;
  bezeichnung: string;
  /** Miteigentumsanteil, z. B. 186 von 1.000. */
  mea: number;
  /** Personen-IDs der Eigentümer dieser Einheit. */
  eigentuemer: string[];
}

export interface Stimmabgabe {
  einheitId: string;
  wert: Stimmwert;
}

export interface Ergebnis {
  prinzip: Stimmrechtsprinzip;
  mehrheit: Mehrheit;
  ja: number;
  nein: number;
  enthaltung: number;
  /** Summe aller Stimmen der Gemeinschaft im gewählten Prinzip. */
  gesamt: number;
  /** Ja-MEA, nötig für die qualifizierte Mehrheit. */
  jaMea: number;
  meaGesamt: number;
  angenommen: boolean;
}

export class Abstimmungsfehler extends Error {}

/** Schlüssel für einen Stimmberechtigten im Kopfprinzip: die Eigentümergruppe einer Einheit. */
function kopfSchluessel(e: Einheit): string {
  return [...e.eigentuemer].sort().join("+");
}

export function zaehleStimmen(
  einheiten: Einheit[],
  abgaben: Stimmabgabe[],
  prinzip: Stimmrechtsprinzip,
  mehrheit: Mehrheit = "einfach",
): Ergebnis {
  const nachId = new Map(einheiten.map((e) => [e.id, e]));
  const gesehen = new Set<string>();
  for (const a of abgaben) {
    if (!nachId.has(a.einheitId)) {
      throw new Abstimmungsfehler(`Unbekannte Einheit ${a.einheitId}`);
    }
    if (gesehen.has(a.einheitId)) {
      throw new Abstimmungsfehler(`Für Einheit ${a.einheitId} wurde doppelt abgestimmt`);
    }
    gesehen.add(a.einheitId);
  }

  const summe = { ja: 0, nein: 0, enthaltung: 0 };
  let gesamt = 0;

  if (prinzip === "kopf") {
    // Jede Eigentümergruppe hat eine Stimme, auch wenn ihr mehrere Einheiten gehören.
    const koepfe = new Map<string, Stimmwert>();
    for (const a of abgaben) {
      const key = kopfSchluessel(nachId.get(a.einheitId)!);
      const bisher = koepfe.get(key);
      if (bisher && bisher !== a.wert) {
        throw new Abstimmungsfehler(
          "Eine Eigentümergruppe hat für ihre Einheiten unterschiedlich abgestimmt. Im Kopfprinzip hat sie nur eine Stimme.",
        );
      }
      koepfe.set(key, a.wert);
    }
    for (const wert of koepfe.values()) summe[wert] += 1;
    gesamt = new Set(einheiten.map(kopfSchluessel)).size;
  } else {
    for (const a of abgaben) {
      summe[a.wert] += prinzip === "mea" ? nachId.get(a.einheitId)!.mea : 1;
    }
    gesamt = prinzip === "mea" ? einheiten.reduce((s, e) => s + e.mea, 0) : einheiten.length;
  }

  const meaGesamt = einheiten.reduce((s, e) => s + e.mea, 0);
  const jaMea = abgaben
    .filter((a) => a.wert === "ja")
    .reduce((s, a) => s + nachId.get(a.einheitId)!.mea, 0);

  const abgegeben = summe.ja + summe.nein;
  const angenommen =
    mehrheit === "einfach"
      ? summe.ja > summe.nein
      : abgegeben > 0 && summe.ja * 3 > abgegeben * 2 && jaMea * 2 > meaGesamt;

  return { prinzip, mehrheit, ...summe, gesamt, jaMea, meaGesamt, angenommen };
}
