import Link from "next/link";
import { notFound } from "next/navigation";
import { mitgliedschaft } from "@/lib/auth";
import { einladungenZurVersammlung, versammlungMitTops } from "@/lib/daten";
import { formatDatumLang } from "@/lib/format";

/** Die Einladung als Brief für Eigentümer ohne E-Mail-Adresse, zum Ausdrucken. */
export default async function Brief({ params }: { params: Promise<{ wegId: string; id: string; einladungId: string }> }) {
  const { wegId, id, einladungId } = await params;
  const { weg, konto, darfBearbeiten } = await mitgliedschaft(wegId);
  if (!darfBearbeiten) notFound();
  const v = await versammlungMitTops(weg.id, id);
  const z = v && (await einladungenZurVersammlung(v.id)).find((e) => e.id === einladungId);
  if (!v || !z) notFound();

  return (
    <article className="druckseite">
      <p className="nicht-drucken">
        <Link href={`/weg/${weg.id}/versammlungen/${v.id}`}>Zurück zur Versammlung</Link> · Drucken Sie diese Seite und
        vermerken Sie danach, wann der Brief zur Post ging.
      </p>
      <p className="absender">
        {konto.name} · {weg.name} · {weg.adresse}
      </p>
      <p>{z.name}</p>
      <p className="datum">{formatDatumLang(new Date())}</p>
      <h1 className="brief-betreff">{z.betreff}</h1>
      <div className="brief-text">{z.inhalt}</div>
    </article>
  );
}
