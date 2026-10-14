import { AktionsFormular } from "@/components/aktions-formular";
import { legeWegAn } from "@/lib/aktionen/weg";
import { kontoErforderlich } from "@/lib/auth";

export default async function NeueWeg() {
  await kontoErforderlich();
  return (
    <main className="schmal">
      <div className="seitenkopf">
        <p className="eyebrow">Neue Gemeinschaft</p>
        <h1>
          <span className="light">WEG</span> anlegen
        </h1>
        <p>Sie übernehmen die Verwaltung dieser Gemeinschaft in smartWEG. Einheiten und Eigentümer tragen Sie im nächsten Schritt ein.</p>
      </div>
      <section className="flaeche">
        <AktionsFormular className="formular" aktion={legeWegAn}>
          <label>
            Name der Gemeinschaft
            <input id="w-name" name="name" required placeholder="z. B. WEG Gartenstraße 5" />
          </label>
          <label>
            Anschrift
            <input id="w-adresse" name="adresse" required placeholder="Gartenstraße 5, 53111 Bonn" />
          </label>
          <label>
            Stimmrecht laut Teilungserklärung
            <select id="w-prinzip" name="prinzip" defaultValue="kopf">
              <option value="kopf">Kopfprinzip: eine Stimme je Eigentümer (gesetzlicher Regelfall)</option>
              <option value="objekt">Objektprinzip: eine Stimme je Einheit</option>
              <option value="mea">Wertprinzip: nach Miteigentumsanteilen (MEA)</option>
            </select>
          </label>
          <p className="para">§ 25 Abs. 2 WEG. Steht in der Teilungserklärung nichts anderes, gilt das Kopfprinzip.</p>
          <button className="knopf primaer" type="submit">
            Gemeinschaft anlegen
          </button>
        </AktionsFormular>
      </section>
    </main>
  );
}
