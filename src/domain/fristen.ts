/**
 * Einladungsfrist zur Eigentümerversammlung: mindestens drei Wochen, außer bei
 * besonderer Dringlichkeit (§ 24 Abs. 4 Satz 2 WEG). Gerechnet wird ab dem
 * Zugang der Einladung. Für Briefpost setzen wir pauschal drei Tage Laufzeit an.
 */

export const EINLADUNGSFRIST_TAGE = 21;
export const POSTLAUFZEIT_TAGE = 3;

export type Versandweg = "email" | "post";

const TAG_MS = 24 * 60 * 60 * 1000;

/** Datum ohne Uhrzeit in UTC, damit Sommerzeit die Tageszählung nicht verschiebt. */
function tag(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function zugangsdatum(versand: Date, weg: Versandweg): Date {
  return new Date(tag(versand) + (weg === "post" ? POSTLAUFZEIT_TAGE : 0) * TAG_MS);
}

/** Spätester Tag, an dem die Einladung auf diesem Weg verschickt werden muss. */
export function spaetesterVersand(versammlung: Date, weg: Versandweg): Date {
  const puffer = weg === "post" ? POSTLAUFZEIT_TAGE : 0;
  return new Date(tag(versammlung) - (EINLADUNGSFRIST_TAGE + puffer) * TAG_MS);
}

export interface Fristpruefung {
  eingehalten: boolean;
  /** Tage zwischen Zugang und Versammlung. */
  tageVorlauf: number;
  spaetesterVersand: Date;
}

export function pruefeEinladungsfrist(
  versammlung: Date,
  versand: Date,
  weg: Versandweg,
): Fristpruefung {
  const tageVorlauf = Math.round((tag(versammlung) - tag(zugangsdatum(versand, weg))) / TAG_MS);
  return {
    eingehalten: tageVorlauf >= EINLADUNGSFRIST_TAGE,
    tageVorlauf,
    spaetesterVersand: spaetesterVersand(versammlung, weg),
  };
}
