/**
 * Beschlusssammlung nach § 24 Abs. 7 WEG: Beschlüsse werden fortlaufend
 * nummeriert, mit Wortlaut sowie Ort und Datum der Versammlung, unverzüglich
 * eingetragen.
 */

export interface Beschlusseintrag {
  nummer: number;
  wortlaut: string;
  ort: string;
  datum: Date;
  angenommen: boolean;
}

export function naechsteNummer(eintraege: Pick<Beschlusseintrag, "nummer">[]): number {
  return eintraege.reduce((max, e) => Math.max(max, e.nummer), 0) + 1;
}

/** Ein Beschluss braucht einen Wortlaut, der aus sich heraus verständlich ist. */
export function pruefeWortlaut(wortlaut: string): string | null {
  const text = wortlaut.trim();
  if (text.length < 10) return "Bitte formulieren Sie den Beschluss als vollständigen Satz.";
  return null;
}
