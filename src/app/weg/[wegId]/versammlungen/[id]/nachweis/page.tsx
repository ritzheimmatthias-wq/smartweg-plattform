import Link from "next/link";
import { notFound } from "next/navigation";
import { pruefeEinladungsfrist, zugangsdatum } from "@/domain/fristen";
import { mitgliedschaft } from "@/lib/auth";
import { einladungenZurVersammlung, einladungsstand, versammlungMitTops } from "@/lib/daten";
import { formatDatum, formatDatumLang } from "@/lib/format";

const uhrzeit = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** Fristnachweis nach § 24 Abs. 4 WEG: wer wann auf welchem Weg eingeladen wurde. Zum Ausdrucken und Ablegen. */
export default async function Nachweis({ params }: { params: Promise<{ wegId: string; id: string }> }) {
  const { wegId, id } = await params;
  const { weg, darfBearbeiten } = await mitgliedschaft(wegId);
  if (!darfBearbeiten) notFound();
  const v = await versammlungMitTops(weg.id, id);
  if (!v) notFound();
  const [einladungen, nachweis] = await Promise.all([einladungenZurVersammlung(v.id), einladungsstand(weg.id, v.id, v.datum)]);
  const testmodus = einladungen.some((z) => z.testmodus);
  const muster = einladungen[0];

  return (
    <article className="druckseite">
      <p className="nicht-drucken">
        <Link href={`/weg/${weg.id}/versammlungen/${v.id}`}>Zurück zur Versammlung</Link> · Über die Druckfunktion des
        Browsers als PDF speichern.
      </p>
      <p className="eyebrow">Nachweis der Einladungsfrist · § 24 Abs. 4 WEG</p>
      <h1>{v.titel}</h1>
      <p>
        {weg.name}, {weg.adresse}
        <br />
        {formatDatumLang(v.datum)}, {v.uhrzeit} Uhr · {v.ort}
      </p>
      {testmodus && <p className="hinweis">Testmodus: Diese Einladungen wurden nicht per E-Mail verschickt.</p>}
      {nachweis && (
        <p className={`status ${nachweis.eingehalten ? "ok" : "warn"}`}>
          {nachweis.eingehalten
            ? `Frist eingehalten: Alle Eigentümer sind mindestens ${nachweis.kuerzesterVorlauf} Tage vor der Versammlung eingeladen.`
            : `Frist nicht nachgewiesen: ${nachweis.offen} noch nicht eingeladen, ${nachweis.unterschritten} zu spät.`}
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>Eigentümer</th>
            <th>Einheit</th>
            <th>Weg</th>
            <th>Versandt</th>
            <th>Zugang</th>
            <th className="zahl">Tage</th>
            <th>Bestätigt</th>
          </tr>
        </thead>
        <tbody>
          {einladungen.map((z) => {
            const versandt = z.status === "versandt" ? z.versandtAm : null;
            const pruefung = versandt ? pruefeEinladungsfrist(v.datum, versandt, z.versandweg) : null;
            return (
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>{z.einheiten}</td>
                <td>{z.versandweg === "email" ? `E-Mail an ${z.email}` : "Brief"}</td>
                <td>
                  {versandt
                    ? `${formatDatum(versandt)}${z.versandweg === "email" ? `, ${uhrzeit.format(versandt)} Uhr` : ""}`
                    : z.status === "fehler"
                      ? "nicht zugestellt"
                      : "offen"}
                </td>
                <td>{versandt ? formatDatum(zugangsdatum(versandt, z.versandweg)) : "–"}</td>
                <td className={`zahl ${pruefung && !pruefung.eingehalten ? "warn-text" : ""}`}>{pruefung ? pruefung.tageVorlauf : "–"}</td>
                <td>
                  {z.bestaetigtAm ? `${formatDatum(z.bestaetigtAm)}, ${uhrzeit.format(z.bestaetigtAm)} Uhr` : "–"}
                  {!z.personId && <span className="klein"> (nicht mehr Eigentümer)</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="para">
        Zugang: E-Mail am Versandtag, Brief drei Tage nach Aufgabe zur Post. Mindestvorlauf 21 Tage. Bestätigt: Der
        Eigentümer hat den Empfang über den Link in der Einladung bestätigt.
      </p>

      {muster && (
        <section>
          <h2>Versandter Text (Beispiel: {muster.name})</h2>
          <p className="klein">Betreff: {muster.betreff}</p>
          <div className="brief-text">{muster.inhalt}</div>
        </section>
      )}
    </article>
  );
}
