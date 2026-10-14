import Link from "next/link";
import { AktionsFormular } from "@/components/aktions-formular";
import { FristStatus } from "@/components/frist-status";
import { legeVersammlungAn } from "@/lib/aktionen/versammlung";
import { mitgliedschaft } from "@/lib/auth";
import { einladungsstand, versammlungenDerWeg } from "@/lib/daten";
import { formatDatumLang } from "@/lib/format";

export default async function Versammlungen({ params }: { params: Promise<{ wegId: string }> }) {
  const { wegId } = await params;
  const { weg, darfBearbeiten } = await mitgliedschaft(wegId);
  const versammlungen = await Promise.all(
    (await versammlungenDerWeg(weg.id)).map(async (v) => ({ ...v, nachweis: await einladungsstand(weg.id, v.id, v.datum) })),
  );

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">Versammlungen</p>
        <h1>
          <span className="light">Eigentümer</span>versammlungen
        </h1>
        <p>Planen Sie die Versammlung, laden Sie fristgerecht ein und erfassen Sie die Abstimmungen je Tagesordnungspunkt.</p>
      </div>

      <section className="flaeche" aria-labelledby="t-liste">
        <h2 id="t-liste">Alle Versammlungen</h2>
        {versammlungen.length === 0 ? (
          <p className="klein">Noch keine Versammlung angelegt.</p>
        ) : (
          <ul className="liste">
            {versammlungen.map((v) => (
              <li key={v.id}>
                <Link href={`/weg/${weg.id}/versammlungen/${v.id}`}>{v.titel}</Link>
                <span className="klein">
                  {formatDatumLang(v.datum)}, {v.uhrzeit} Uhr · {v.ort}
                  {v.onlineTeilnahme ? " · auch online" : ""}
                </span>
                <FristStatus datum={v.datum} versandt={v.einladungVersandtAm} weg={v.versandweg} nachweis={v.nachweis} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {darfBearbeiten && (
      <section className="flaeche" aria-labelledby="t-neu">
        <h2 id="t-neu">Neue Versammlung planen</h2>
        <AktionsFormular className="formular" aktion={legeVersammlungAn.bind(null, weg.id)}>
          <label>
            Titel
            <input id="v-titel" name="titel" required defaultValue="Ordentliche Eigentümerversammlung" />
          </label>
          <div className="felder">
            <label>
              Datum
              <input id="v-datum" name="datum" type="date" required />
            </label>
            <label>
              Uhrzeit
              <input id="v-uhrzeit" name="uhrzeit" type="time" required defaultValue="19:00" />
            </label>
            <label>
              Einladung per
              <select id="v-versandweg" name="versandweg" defaultValue="email">
                <option value="email">E-Mail</option>
                <option value="post">Brief</option>
              </select>
            </label>
          </div>
          <label>
            Ort
            <input id="v-ort" name="ort" required placeholder="z. B. Gemeinschaftsraum im Souterrain" />
          </label>
          <label className="check">
            <input id="v-online" name="online" type="checkbox" />
            Online-Teilnahme zulassen (setzt einen Beschluss nach § 23 Abs. 1a WEG voraus)
          </label>
          <button className="knopf primaer" type="submit">
            Versammlung anlegen
          </button>
        </AktionsFormular>
      </section>
      )}
    </>
  );
}
