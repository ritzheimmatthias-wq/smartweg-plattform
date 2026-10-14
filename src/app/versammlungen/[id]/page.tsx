import Link from "next/link";
import { notFound } from "next/navigation";
import { AktionsFormular } from "@/components/aktions-formular";
import { FristStatus } from "@/components/frist-status";
import { spaetesterVersand } from "@/domain/fristen";
import { fuegeTopHinzu, vermerkeEinladung } from "@/lib/aktionen";
import { versammlungMitTops } from "@/lib/daten";
import { formatDatumLang, isoDatum } from "@/lib/format";

export default async function Versammlung({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await versammlungMitTops(id);
  if (!v) notFound();

  const vermerke = vermerkeEinladung.bind(null, v.id);
  const neuerTop = fuegeTopHinzu.bind(null, v.id);

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">
          <Link href="/versammlungen">Versammlungen</Link> / {formatDatumLang(v.datum)}
        </p>
        <h1>{v.titel}</h1>
        <p>
          {formatDatumLang(v.datum)}, {v.uhrzeit} Uhr · {v.ort}
          {v.onlineTeilnahme ? " · Online-Teilnahme möglich" : ""}
        </p>
      </div>

      <section className="flaeche" aria-labelledby="t-einladung">
        <h2 id="t-einladung">Einladung</h2>
        <FristStatus datum={v.datum} versandt={v.einladungVersandtAm} weg={v.versandweg} />
        <p className="klein">
          Spätester Versand per E-Mail: {formatDatumLang(spaetesterVersand(v.datum, "email"))} · per Brief:{" "}
          {formatDatumLang(spaetesterVersand(v.datum, "post"))}
        </p>
        <p className="para">§ 24 Abs. 4 WEG: mindestens drei Wochen ab Zugang. Für Briefe rechnet smartWEG drei Tage Postlaufzeit.</p>
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
      </section>

      <section className="flaeche" aria-labelledby="t-tops">
        <h2 id="t-tops">Tagesordnung</h2>
        {v.tops.length === 0 ? (
          <p className="klein">Noch keine Tagesordnungspunkte.</p>
        ) : (
          <ul className="liste">
            {v.tops.map((t) => (
              <li key={t.id}>
                <Link href={`/versammlungen/${v.id}/top/${t.id}`}>
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
    </>
  );
}
