import type { Ergebnis } from "@/domain/abstimmung";
import { EINHEIT_TEXT, formatZahl } from "@/lib/format";

export function Ergebnisbalken({ ergebnis }: { ergebnis: Pick<Ergebnis, "ja" | "nein" | "enthaltung" | "gesamt" | "prinzip"> }) {
  const { ja, nein, enthaltung, gesamt, prinzip } = ergebnis;
  const anteil = (n: number) => `${gesamt ? (n / gesamt) * 100 : 0}%`;
  const einheit = EINHEIT_TEXT[prinzip];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="balken" role="img" aria-label={`Ja ${ja}, Nein ${nein}, Enthaltung ${enthaltung} von ${gesamt} ${einheit}`}>
        <span className="ja" style={{ width: anteil(ja) }} />
        <span className="nein" style={{ width: anteil(nein) }} />
        <span className="enth" style={{ width: anteil(enthaltung) }} />
      </div>
      <div className="legende">
        <span>Ja <b>{formatZahl(ja)}</b></span>
        <span>Nein <b>{formatZahl(nein)}</b></span>
        <span>Enthaltung <b>{formatZahl(enthaltung)}</b></span>
        <span>nicht abgestimmt <b>{formatZahl(Math.max(gesamt - ja - nein - enthaltung, 0))}</b></span>
        <span>von {formatZahl(gesamt)} {einheit}</span>
      </div>
    </div>
  );
}
