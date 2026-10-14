import Link from "next/link";
import { notFound } from "next/navigation";
import { AktionsFormular } from "@/components/aktions-formular";
import { FristStatus } from "@/components/frist-status";
import { spaetesterVersand } from "@/domain/fristen";
import { fuegeTopHinzu, vermerkeEinladung } from "@/lib/aktionen/versammlung";
import { mitgliedschaft } from "@/lib/auth";
import { empfaenger } from "@/domain/einladung";
import { DEMO_WEG_ID } from "@/db/seed";
import { versendeEinladungen, vermerkeBrief } from "@/lib/aktionen/einladung";
import { einheitenDerWeg, einladungenZurVersammlung, einladungsstand, versammlungMitTops } from "@/lib/daten";
import { mailVersandEingerichtet } from "@/lib/mailer";
import { formatDatum, formatDatumLang, isoDatum } from "@/lib/format";

export default async function Versammlung({ params }: { params: Promise<{ wegId: string; id: string }> }) {
  const { wegId, id } = await params;
  const { weg, darfBearbeiten } = await mitgliedschaft(wegId);
  const basis = `/weg/${weg.id}/versammlungen`;
  const v = await versammlungMitTops(weg.id, id);
  if (!v) notFound();

  const vermerke = vermerkeEinladung.bind(null, weg.id, v.id);
  const versende = versendeEinladungen.bind(null, weg.id, v.id);
  const [einladungen, nachweis, einheiten] = await Promise.all([
    einladungenZurVersammlung(v.id),
    einladungsstand(weg.id, v.id, v.datum),
    einheitenDerWeg(weg.id),
  ]);
  // Gleiche Regel wie in versendeEinladungen: offen ist, wer noch keine Einladung hat, bei wem der Versand
  // fehlschlug oder wer statt eines vorbereiteten Briefs inzwischen eine E-Mail-Adresse hat.
  const nachPerson = new Map(einladungen.map((z) => [z.personId, z]));
  const nochZuVersenden = empfaenger(einheiten).some((p) => {
    const z = nachPerson.get(p.personId);
    return !z || z.status === "fehler" || (z.status === "offen" && Boolean(p.email));
  });
  const testmodus = !mailVersandEingerichtet() || weg.id === DEMO_WEG_ID;
  const neuerTop = fuegeTopHinzu.bind(null, weg.id, v.id);

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">
          <Link href={basis}>Versammlungen</Link> / {formatDatumLang(v.datum)}
        </p>
        <h1>{v.titel}</h1>
        <p>
          {formatDatumLang(v.datum)}, {v.uhrzeit} Uhr · {v.ort}
          {v.onlineTeilnahme ? " · Online-Teilnahme möglich" : ""}
        </p>
      </div>

      <section className="flaeche" aria-labelledby="t-einladung">
        <h2 id="t-einladung">Einladung</h2>
        <FristStatus datum={v.datum} versandt={v.einladungVersandtAm} weg={v.versandweg} nachweis={nachweis} />
        <p className="klein">
          Spätester Versand per E-Mail: {formatDatumLang(spaetesterVersand(v.datum, "email"))} · per Brief:{" "}
          {formatDatumLang(spaetesterVersand(v.datum, "post"))}
        </p>
        <p className="para">
          § 24 Abs. 4 WEG: Einladung in Textform, mindestens drei Wochen ab Zugang bei jedem Eigentümer. Für Briefe rechnet
          smartWEG drei Tage Postlaufzeit.
        </p>

        {darfBearbeiten && einladungen.length > 0 && (
          <div className="tabelle-wrap">
            <table>
              <thead>
                <tr>
                  <th>Eigentümer</th>
                  <th>Weg</th>
                  <th>Versandt</th>
                  <th>Empfang bestätigt</th>
                  <th>Stand</th>
                </tr>
              </thead>
              <tbody>
                {einladungen.map((z) => (
                  <tr key={z.id}>
                    <td>
                      {z.name}
                      <br />
                      <span className="klein">{z.einheiten}</span>
                    </td>
                    <td className="klein">{z.versandweg === "email" ? z.email : "Brief"}</td>
                    <td className="klein">{z.versandtAm ? formatDatum(z.versandtAm) : "–"}</td>
                    <td className="klein">{z.bestaetigtAm ? formatDatum(z.bestaetigtAm) : "–"}</td>
                    <td>
                      {z.status === "versandt" && <span className="status ok">{z.testmodus ? "Testmodus" : "versandt"}</span>}
                      {z.status === "fehler" && <span className="status warn" title={z.fehler ?? undefined}>nicht zugestellt</span>}
                      {z.status === "offen" && (
                        <div className="brief">
                          <Link href={`${basis}/${v.id}/brief/${z.id}`}>Brief drucken</Link>
                          <AktionsFormular className="zeile" aktion={vermerkeBrief.bind(null, weg.id, v.id, z.id)}>
                            <label>
                              Zur Post gegeben am
                              <input name="versandt" type="date" required defaultValue={isoDatum(new Date())} />
                            </label>
                            <button className="knopf klein-knopf" type="submit">
                              Vermerken
                            </button>
                          </AktionsFormular>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {darfBearbeiten && (
          <AktionsFormular className="formular" aktion={versende}>
            {testmodus && (
              <p className="klein">
                Testmodus: Es ist noch kein Mailserver eingerichtet. smartWEG erstellt und speichert die Einladungen, verschickt
                aber keine E-Mails.
              </p>
            )}
            <button className="knopf primaer" type="submit" disabled={v.tops.length === 0 || !nochZuVersenden}>
              {einladungen.length === 0 ? "Einladung an alle Eigentümer verschicken" : "Fehlende Einladungen verschicken"}
            </button>
            {v.tops.length === 0 && <p className="klein">Legen Sie zuerst die Tagesordnung an, sie gehört in die Einladung.</p>}
          </AktionsFormular>
        )}

        {einladungen.length > 0 && darfBearbeiten && (
          <Link className="knopf" href={`${basis}/${v.id}/nachweis`}>
            Fristnachweis ansehen und drucken
          </Link>
        )}

        {darfBearbeiten && einladungen.length === 0 && (
          <details>
            <summary className="klein">Schon außerhalb von smartWEG eingeladen? Versand vermerken</summary>
            <AktionsFormular className="formular" aktion={vermerke}>
              <div className="felder">
                <label>
                  Versandt am
                  <input
                    id="e-versandt"
                    name="versandt"
                    type="date"
                    required
                    defaultValue={v.einladungVersandtAm ? isoDatum(v.einladungVersandtAm) : undefined}
                  />
                </label>
                <label>
                  Versandweg
                  <select id="e-versandweg" name="versandweg" defaultValue={v.versandweg}>
                    <option value="email">E-Mail</option>
                    <option value="post">Brief</option>
                  </select>
                </label>
              </div>
              <button className="knopf" type="submit">
                Versand vermerken
              </button>
            </AktionsFormular>
          </details>
        )}
      </section>

      <section className="flaeche" aria-labelledby="t-tops">
        <h2 id="t-tops">Tagesordnung</h2>
        {v.tops.length === 0 ? (
          <p className="klein">Noch keine Tagesordnungspunkte.</p>
        ) : (
          <ul className="liste">
            {v.tops.map((t) => (
              <li key={t.id}>
                <Link href={`${basis}/${v.id}/top/${t.id}`}>
                  TOP {t.nummer} · {t.titel}
                </Link>
                <span className="klein">{t.beschlussantrag}</span>
                <span className={`status ${t.verkuendetAm ? "ok" : "neutral"}`}>
                  {t.verkuendetAm ? "Beschluss verkündet" : "Abstimmung offen"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {darfBearbeiten && (
      <section className="flaeche" aria-labelledby="t-neuer-top">
        <h2 id="t-neuer-top">Tagesordnungspunkt hinzufügen</h2>
        <AktionsFormular className="formular" aktion={neuerTop}>
          <label>
            Titel
            <input id="t-titel" name="titel" required placeholder="z. B. Erneuerung der Haustür" />
          </label>
          <label>
            Beschlussantrag im Wortlaut
            <textarea
              id="t-antrag"
              name="beschlussantrag"
              required
              placeholder="z. B. Die Haustür wird nach Angebot der Tischlerei Brück vom 01.10.2026 für bis zu 3.200 € erneuert."
            />
          </label>
          <label>
            Erforderliche Mehrheit
            <select id="t-mehrheit" name="mehrheit" defaultValue="einfach">
              <option value="einfach">Einfache Mehrheit der abgegebenen Stimmen (§ 25 Abs. 1 WEG)</option>
              <option value="zweiDrittelUndHalbeMea">
                Mehr als zwei Drittel und mehr als die Hälfte aller MEA (§ 21 Abs. 2 Nr. 1 WEG)
              </option>
            </select>
          </label>
          <button className="knopf primaer" type="submit">
            Hinzufügen
          </button>
        </AktionsFormular>
      </section>
      )}
    </>
  );
}
