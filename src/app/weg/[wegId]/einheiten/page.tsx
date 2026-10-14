import { AktionsFormular } from "@/components/aktions-formular";
import { meaHinweis } from "@/domain/stammdaten";
import { entferneEigentuemer, fuegeEigentuemerHinzu, loescheEinheit, speichereEinheit } from "@/lib/aktionen/weg";
import { mitgliedschaft } from "@/lib/auth";
import { einheitenDerWeg } from "@/lib/daten";
import { formatZahl, PRINZIP_TEXT } from "@/lib/format";

export default async function Einheiten({ params }: { params: Promise<{ wegId: string }> }) {
  const { wegId } = await params;
  const { weg, darfBearbeiten } = await mitgliedschaft(wegId);
  const einheiten = await einheitenDerWeg(weg.id);
  const summe = einheiten.reduce((s, e) => s + e.mea, 0);
  const hinweis = meaHinweis(summe);

  return (
    <>
      <div className="seitenkopf">
        <p className="eyebrow">Einheiten und Eigentümer</p>
        <h1>
          <span className="light">{einheiten.length} Einheiten,</span> {formatZahl(summe)} MEA
        </h1>
        <p>
          {PRINZIP_TEXT[weg.stimmrechtsprinzip]}. Eigentümer mit E-Mail-Adresse erhalten Lesezugriff, sobald sie sich mit
          dieser Adresse registrieren.
        </p>
      </div>
      {hinweis && <p className="hinweis">{hinweis}</p>}

      {einheiten.map((e) => (
        <section className="flaeche" key={e.id} aria-label={e.bezeichnung}>
          {darfBearbeiten ? (
            <AktionsFormular className="formular" aktion={speichereEinheit.bind(null, weg.id, e.id)}>
              <div className="zeile">
                <label>
                  Bezeichnung
                  <input id={`b-${e.id}`} name="bezeichnung" defaultValue={e.bezeichnung} required />
                </label>
                <label>
                  MEA
                  <input id={`m-${e.id}`} name="mea" inputMode="numeric" defaultValue={e.mea} required />
                </label>
                <button className="knopf" type="submit">
                  Speichern
                </button>
              </div>
            </AktionsFormular>
          ) : (
            <h2>
              {e.bezeichnung} <span className="klein">{formatZahl(e.mea)} MEA</span>
            </h2>
          )}

          <ul className="personen">
            {e.personen.length === 0 && <li className="klein">Noch kein Eigentümer eingetragen.</li>}
            {e.personen.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                {p.email && <span className="klein">{p.email}</span>}
                <span className={`status ${p.hatZugang ? "ok" : "neutral"}`}>
                  {p.hatZugang ? "hat Zugang" : p.email ? "noch nicht registriert" : "ohne E-Mail"}
                </span>
                {darfBearbeiten && (
                  <AktionsFormular aktion={entferneEigentuemer.bind(null, weg.id, e.id, p.id)}>
                    <button className="knopf klein-knopf" type="submit">
                      Entfernen
                    </button>
                  </AktionsFormular>
                )}
              </li>
            ))}
          </ul>

          {darfBearbeiten && (
            <div className="einheit-block">
              <AktionsFormular className="formular" aktion={fuegeEigentuemerHinzu.bind(null, weg.id, e.id)}>
                <div className="zeile">
                  <label>
                    Eigentümer
                    <input id={`pn-${e.id}`} name="name" required placeholder="Vor- und Nachname" />
                  </label>
                  <label>
                    E-Mail (für den Zugang)
                    <input id={`pe-${e.id}`} name="email" type="email" placeholder="optional" />
                  </label>
                  <button className="knopf" type="submit">
                    Hinzufügen
                  </button>
                </div>
              </AktionsFormular>
              <AktionsFormular aktion={loescheEinheit.bind(null, weg.id, e.id)}>
                <button className="knopf klein-knopf gefahr" type="submit">
                  Einheit löschen
                </button>
              </AktionsFormular>
            </div>
          )}
        </section>
      ))}

      {darfBearbeiten && (
        <section className="flaeche" aria-labelledby="t-neue-einheit">
          <h2 id="t-neue-einheit">Einheit hinzufügen</h2>
          <AktionsFormular className="formular" aktion={speichereEinheit.bind(null, weg.id, null)}>
            <div className="zeile">
              <label>
                Bezeichnung
                <input id="n-bezeichnung" name="bezeichnung" required placeholder="z. B. 2. OG rechts" />
              </label>
              <label>
                MEA
                <input id="n-mea" name="mea" inputMode="numeric" required placeholder="z. B. 165" />
              </label>
              <button className="knopf primaer" type="submit">
                Hinzufügen
              </button>
            </div>
          </AktionsFormular>
          <p className="para">Die Miteigentumsanteile stehen in der Teilungserklärung, meist als Bruchteil von 1.000.</p>
        </section>
      )}
    </>
  );
}
