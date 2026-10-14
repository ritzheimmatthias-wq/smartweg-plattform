import Link from "next/link";
import { FristStatus } from "@/components/frist-status";
import { mitgliedschaft } from "@/lib/auth";
import { beschluesseDerWeg, einheitenDerWeg, einladungsstand, versammlungenDerWeg } from "@/lib/daten";
import { formatDatum, formatZahl, PRINZIP_TEXT } from "@/lib/format";

export default async function Uebersicht({ params }: { params: Promise<{ wegId: string }> }) {
  const { wegId } = await params;
  const { weg, darfBearbeiten } = await mitgliedschaft(wegId);
  const basis = `/weg/${weg.id}`;
  const [einheiten, versammlungen, beschluesse] = await Promise.all([
    einheitenDerWeg(weg.id),
    versammlungenDerWeg(weg.id),
    beschluesseDerWeg(weg.id),
  ]);
  const meaSumme = einheiten.reduce((s, e) => s + e.mea, 0);
  const eigentuemer = new Set(einheiten.flatMap((e) => e.eigentuemer)).size;
  const heute = new Date();
  const naechste = [...versammlungen].reverse().find((v) => v.datum >= new Date(heute.toISOString().slice(0, 10)));
  const nachweis = naechste ? await einladungsstand(weg.id, naechste.id, naechste.datum) : null;

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">Übersicht</p>
        <h1>
          <span className="light">{weg.name.split(" ")[0]}</span> {weg.name.split(" ").slice(1).join(" ")}
        </h1>
        <p>{weg.adresse}</p>
      </div>

      <div className="raster">
        <section className="flaeche" aria-labelledby="k-einheiten">
          <p className="eyebrow" id="k-einheiten">Einheiten</p>
          <p className="kennzahl">{einheiten.length}</p>
          <p className="klein">{eigentuemer} Eigentümer · {formatZahl(meaSumme)} MEA</p>
        </section>
        <section className="flaeche" aria-labelledby="k-versammlung">
          <p className="eyebrow" id="k-versammlung">Nächste Versammlung</p>
          {naechste ? (
            <>
              <p className="kennzahl">{formatDatum(naechste.datum)}</p>
              <FristStatus datum={naechste.datum} versandt={naechste.einladungVersandtAm} weg={naechste.versandweg} nachweis={nachweis} />
              <Link href={`${basis}/versammlungen/${naechste.id}`}>Zur Versammlung</Link>
            </>
          ) : (
            <>
              <p className="klein">Keine Versammlung geplant.</p>
              {darfBearbeiten && <Link href={`${basis}/versammlungen`}>Versammlung planen</Link>}
            </>
          )}
        </section>
        <section className="flaeche" aria-labelledby="k-beschluesse">
          <p className="eyebrow" id="k-beschluesse">Beschlusssammlung</p>
          <p className="kennzahl">{beschluesse.length}</p>
          <p className="klein">
            {beschluesse[0] ? `Zuletzt Nr. ${beschluesse[0].nummer} vom ${formatDatum(beschluesse[0].datum)}` : "Noch keine Einträge"}
          </p>
          <Link href={`${basis}/beschluesse`}>Alle Beschlüsse</Link>
        </section>
      </div>

      <section className="flaeche" aria-labelledby="t-einheiten">
        <h2 id="t-einheiten">Einheiten und Eigentümer</h2>
        <p className="klein">Stimmrecht laut Teilungserklärung: {PRINZIP_TEXT[weg.stimmrechtsprinzip]}</p>
        <div className="tabelle-wrap">
          <table>
            <thead>
              <tr>
                <th>Einheit</th>
                <th>Eigentümer</th>
                <th className="zahl">MEA</th>
                <th className="zahl">Anteil</th>
              </tr>
            </thead>
            <tbody>
              {einheiten.map((e) => (
                <tr key={e.id}>
                  <td>{e.bezeichnung}</td>
                  <td>{e.namen.join(", ") || "–"}</td>
                  <td className="zahl">{formatZahl(e.mea)}</td>
                  <td className="zahl">{((e.mea / meaSumme) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Summe</td>
                <td className="zahl">{formatZahl(meaSumme)}</td>
                <td className="zahl">100 %</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}
