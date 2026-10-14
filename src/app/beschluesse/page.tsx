import { Ergebnisbalken } from "@/components/ergebnisbalken";
import { aktuelleWeg, beschluesseDerWeg, einheitenDerWeg } from "@/lib/daten";
import { formatDatum } from "@/lib/format";

export default async function Beschlusssammlung() {
  const weg = await aktuelleWeg();
  const [beschluesse, einheiten] = await Promise.all([beschluesseDerWeg(weg.id), einheitenDerWeg(weg.id)]);
  const meaSumme = einheiten.reduce((s, e) => s + e.mea, 0);
  const koepfe = new Set(einheiten.map((e) => [...e.eigentuemer].sort().join("+"))).size;
  const gesamtFuer = (prinzip: "kopf" | "objekt" | "mea") =>
    prinzip === "mea" ? meaSumme : prinzip === "objekt" ? einheiten.length : koepfe;

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">Beschlusssammlung</p>
        <h1>
          <span className="light">Beschluss</span>sammlung
        </h1>
        <p>
          Alle verkündeten Beschlüsse mit Wortlaut, Ort und Datum der Versammlung, fortlaufend nummeriert. Alle Eigentümer
          können sie jederzeit einsehen.
        </p>
        <p className="para">§ 24 Abs. 7 und 8 WEG</p>
      </div>

      <section className="flaeche">
        {beschluesse.length === 0 ? (
          <p className="klein">Noch keine Beschlüsse eingetragen.</p>
        ) : (
          <ol className="liste">
            {beschluesse.map((b) => (
              <li key={b.id}>
                <span className="klein">
                  Nr. {b.nummer} · {formatDatum(b.datum)} · {b.ort}
                </span>
                <p>{b.wortlaut}</p>
                <span className={`status ${b.angenommen ? "ok" : "warn"}`}>{b.angenommen ? "angenommen" : "abgelehnt"}</span>
                {b.ergebnis && <Ergebnisbalken ergebnis={{ ...b.ergebnis, gesamt: gesamtFuer(b.ergebnis.prinzip) }} />}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
