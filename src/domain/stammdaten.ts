/** Prüfungen für die Stammdaten einer Gemeinschaft. */

export interface EinheitEingabe {
  bezeichnung: string;
  mea: number;
}

export function pruefeEinheit(e: EinheitEingabe): string | null {
  if (!e.bezeichnung.trim()) return "Bitte geben Sie der Einheit eine Bezeichnung, z. B. „EG links“.";
  if (!Number.isInteger(e.mea) || e.mea <= 0) {
    return "Der Miteigentumsanteil muss eine ganze Zahl größer als 0 sein, z. B. 186 (von 1.000).";
  }
  return null;
}

/**
 * Teilungserklärungen verteilen die MEA meist auf 1.000 oder 10.000. Eine
 * andere Summe ist erlaubt, deutet aber oft auf einen Tippfehler hin.
 */
export function meaHinweis(summe: number): string | null {
  if (summe === 0) return null;
  if ([100, 1_000, 10_000, 100_000].includes(summe)) return null;
  return `Die Miteigentumsanteile ergeben zusammen ${summe.toLocaleString("de-DE")}. Üblich sind 1.000 oder 10.000. Bitte prüfen Sie die Angaben mit der Teilungserklärung.`;
}
