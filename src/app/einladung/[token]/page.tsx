import { notFound } from "next/navigation";
import { AktionsFormular } from "@/components/aktions-formular";
import { bestaetigeEmpfang } from "@/lib/aktionen/einladung";
import { einladungZumToken } from "@/lib/daten";
import { formatDatum } from "@/lib/format";

export const metadata = { title: "Einladung · smartWEG", robots: { index: false } };

/** Öffentliche Seite hinter dem Link in der Einladung. Ohne Anmeldung erreichbar. */
export default async function Einladung({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const z = await einladungZumToken(token);
  if (!z) notFound();
  const { einladung } = z;

  return (
    <main className="schmal">
      <div className="seitenkopf">
        <p className="eyebrow">{z.weg.name}</p>
        <h1>{einladung.betreff}</h1>
      </div>
      <section className="flaeche">
        {einladung.bestaetigtAm ? (
          <p className="status ok">Empfang bestätigt am {formatDatum(einladung.bestaetigtAm)}</p>
        ) : (
          <AktionsFormular className="formular" aktion={bestaetigeEmpfang.bind(null, token)}>
            <p>Bitte bestätigen Sie, dass Sie die Einladung erhalten haben. Das hilft der Verwaltung beim Nachweis der Einladungsfrist.</p>
            <button className="knopf primaer" type="submit">
              Empfang bestätigen
            </button>
          </AktionsFormular>
        )}
        <div className="brief-text">{einladung.inhalt}</div>
      </section>
    </main>
  );
}
