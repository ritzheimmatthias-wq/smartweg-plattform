import type { Fristnachweis } from "@/domain/einladung";
import { pruefeEinladungsfrist, spaetesterVersand } from "@/domain/fristen";
import { formatDatum, formatDatumLang } from "@/lib/format";

export function FristStatus({
  datum,
  versandt,
  weg,
  nachweis,
}: {
  datum: Date;
  versandt: Date | null;
  weg: "email" | "post";
  /** Stand der Einzel-Einladungen aus smartWEG; hat Vorrang vor dem manuellen Vermerk. */
  nachweis?: Fristnachweis | null;
}) {
  const spaetestens = spaetesterVersand(datum, weg);
  const verpasst = spaetestens < new Date(new Date().toISOString().slice(0, 10));

  if (nachweis) {
    const emailFrist = spaetesterVersand(datum, "email");
    const zuSpaet = emailFrist < new Date(new Date().toISOString().slice(0, 10));
    if (nachweis.unterschritten > 0) {
      return <p className="status warn">{`Frist bei ${nachweis.unterschritten} Eigentümer${nachweis.unterschritten === 1 ? "" : "n"} unterschritten`}</p>;
    }
    if (nachweis.offen > 0) {
      return (
        <p className={`status ${zuSpaet ? "warn" : "neutral"}`}>
          {`${nachweis.offen} noch nicht eingeladen`}
          {zuSpaet ? ", Frist verpasst" : `, bis ${formatDatum(emailFrist)} per E-Mail`}
        </p>
      );
    }
    return <p className="status ok">{`Alle eingeladen, Frist eingehalten (${nachweis.kuerzesterVorlauf} Tage)`}</p>;
  }

  if (!versandt) {
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
