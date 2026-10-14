import { pruefeEinladungsfrist, spaetesterVersand } from "@/domain/fristen";
import { formatDatum, formatDatumLang } from "@/lib/format";

export function FristStatus({ datum, versandt, weg }: { datum: Date; versandt: Date | null; weg: "email" | "post" }) {
  if (!versandt) {
    const spaetestens = spaetesterVersand(datum, weg);
    const verpasst = spaetestens < new Date(new Date().toISOString().slice(0, 10));
    return (
      <p className={`status ${verpasst ? "warn" : "neutral"}`}>
        {verpasst ? "Einladungsfrist verpasst" : `Einladen bis ${formatDatumLang(spaetestens)}`}
      </p>
    );
  }
  const r = pruefeEinladungsfrist(datum, versandt, weg);
  return (
    <p className={`status ${r.eingehalten ? "ok" : "warn"}`}>
      {r.eingehalten ? `Eingeladen am ${formatDatum(versandt)}, Frist eingehalten` : `Frist unterschritten: ${r.tageVorlauf} statt 21 Tage`}
    </p>
  );
}
