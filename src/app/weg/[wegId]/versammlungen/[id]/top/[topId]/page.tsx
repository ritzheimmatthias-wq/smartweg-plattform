import Link from "next/link";
import { notFound } from "next/navigation";
import { AktionsFormular } from "@/components/aktions-formular";
import { Ergebnisbalken } from "@/components/ergebnisbalken";
import { zaehleStimmen } from "@/domain/abstimmung";
import { speichereStimmen, verkuendeBeschluss } from "@/lib/aktionen/versammlung";
import { mitgliedschaft } from "@/lib/auth";
import { beschlussZuTop, einheitenDerWeg, topMitStimmen, versammlungMitTops } from "@/lib/daten";
import { formatDatumLang, formatZahl, PRINZIP_TEXT } from "@/lib/format";

const MEHRHEIT_TEXT = {
  einfach: "Einfache Mehrheit der abgegebenen Stimmen (§ 25 Abs. 1 WEG)",
  zweiDrittelUndHalbeMea: "Mehr als zwei Drittel der abgegebenen Stimmen und mehr als die Hälfte aller MEA (§ 21 Abs. 2 Nr. 1 WEG)",
} as const;

export default async function Abstimmung({ params }: { params: Promise<{ wegId: string; id: string; topId: string }> }) {
  const { wegId, id, topId } = await params;
  const { weg, darfBearbeiten } = await mitgliedschaft(wegId);
  const [v, top] = await Promise.all([versammlungMitTops(weg.id, id), topMitStimmen(id, topId)]);
  if (!v || !top || top.versammlungId !== v.id) notFound();

  const einheiten = await einheitenDerWeg(weg.id);
  const ergebnis = zaehleStimmen(einheiten, top.abgaben, weg.stimmrechtsprinzip, top.mehrheit);
  const beschluss = top.verkuendetAm ? await beschlussZuTop(top.id) : null;
  const stimmeVon = new Map(top.abgaben.map((a) => [a.einheitId, a.wert]));
  const gesperrt = Boolean(top.verkuendetAm) || !darfBearbeiten;

  const speichern = speichereStimmen.bind(null, weg.id, v.id, top.id);
  const verkuenden = verkuendeBeschluss.bind(null, weg.id, v.id, top.id);

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">
          <Link href={`/weg/${weg.id}/versammlungen/${v.id}`}>{formatDatumLang(v.datum)}</Link> / TOP {top.nummer}
        </p>
        <h1>{top.titel}</h1>
        <p>{top.beschlussantrag}</p>
        <p className="para">
          {PRINZIP_TEXT[weg.stimmrechtsprinzip]} · {MEHRHEIT_TEXT[top.mehrheit]}
        </p>
      </div>

      <section className="flaeche" aria-labelledby="t-ergebnis">
        <h2 id="t-ergebnis">{top.verkuendetAm ? "Verkündetes Ergebnis" : "Zwischenstand"}</h2>
        <Ergebnisbalken ergebnis={ergebnis} />
        {top.abgaben.length > 0 && (
          <p className={`hinweis ${ergebnis.angenommen ? "ok" : ""}`}>
            {ergebnis.angenommen ? "Der Antrag hat die erforderliche Mehrheit." : "Der Antrag hat die erforderliche Mehrheit nicht."}
            {top.mehrheit === "zweiDrittelUndHalbeMea" &&
              ` Ja-Stimmen vertreten ${formatZahl(ergebnis.jaMea)} von ${formatZahl(ergebnis.meaGesamt)} MEA.`}
          </p>
        )}
        {beschluss && (
          <p className="klein">
            Eingetragen als Beschluss Nr. {beschluss.nummer} in der <Link href={`/weg/${weg.id}/beschluesse`}>Beschlusssammlung</Link>.
          </p>
        )}
      </section>

      <section className="flaeche" aria-labelledby="t-stimmen">
        <h2 id="t-stimmen">{gesperrt ? "Abgegebene Stimmen" : "Stimmen erfassen"}</h2>
        <AktionsFormular className="formular" aktion={speichern}>
          <fieldset disabled={gesperrt} style={{ border: 0, padding: 0, margin: 0 }}>
            {einheiten.map((e) => (
              <div className="stimmzeile" key={e.id}>
                <div>
                  <strong>{e.bezeichnung}</strong>
                  <div className="klein">{e.namen.join(", ")}</div>
                </div>
                <span className="klein">{formatZahl(e.mea)} MEA</span>
                <div className="wahl" role="radiogroup" aria-label={`Stimme ${e.bezeichnung}`}>
                  {(
                    [
                      ["ja", "Ja"],
                      ["nein", "Nein"],
                      ["enthaltung", "Enthaltung"],
                      ["", "nicht abgestimmt"],
                    ] as const
                  ).map(([wert, label]) => (
                    <label key={wert || "keine"}>
                      <input
                        id={`stimme-${e.id}-${wert || "keine"}`}
                        type="radio"
                        name={`stimme-${e.id}`}
                        value={wert}
                        defaultChecked={(stimmeVon.get(e.id) ?? "") === wert}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          {!gesperrt && (
            <button className="knopf" type="submit">
              Stimmen speichern
            </button>
          )}
        </AktionsFormular>
      </section>

      {!gesperrt && (
        <section className="flaeche" aria-labelledby="t-verkuenden">
          <h2 id="t-verkuenden">Beschluss verkünden</h2>
          <p className="klein">
            Mit der Verkündung steht das Ergebnis fest. smartWEG trägt den Beschluss mit Wortlaut, Ort und Datum fortlaufend
            nummeriert in die Beschlusssammlung ein (§ 24 Abs. 7 WEG). Danach lassen sich die Stimmen nicht mehr ändern.
          </p>
          <AktionsFormular className="formular" aktion={verkuenden}>
            <button className="knopf primaer" type="submit" disabled={top.abgaben.length === 0}>
              Ergebnis verkünden und eintragen
            </button>
          </AktionsFormular>
        </section>
      )}
    </>
  );
}
