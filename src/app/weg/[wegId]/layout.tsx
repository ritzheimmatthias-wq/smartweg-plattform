import Link from "next/link";
import { DEMO_KONTO_ID } from "@/db/seed";
import { mitgliedschaft } from "@/lib/auth";

export default async function WegLayout({
  params,
  children,
}: {
  params: Promise<{ wegId: string }>;
  children: React.ReactNode;
}) {
  const { wegId } = await params;
  const { weg, rolle, konto } = await mitgliedschaft(wegId);
  const basis = `/weg/${weg.id}`;
  return (
    <>
      <nav className="wegnav" aria-label={weg.name}>
        <div className="wegnav-inner">
          <span className="wegname">
            {weg.name}
            <span className="rolle">{rolle === "verwalter" ? "Verwaltung" : "Eigentümer"}</span>
          </span>
          <Link href={basis}>Übersicht</Link>
          <Link href={`${basis}/einheiten`}>Einheiten</Link>
          <Link href={`${basis}/versammlungen`}>Versammlungen</Link>
          <Link href={`${basis}/beschluesse`}>Beschlusssammlung</Link>
        </div>
      </nav>
      {konto.id === DEMO_KONTO_ID && (
        <div className="demo">Sie sehen die Beispiel-Gemeinschaft. Alle Namen sind erfunden, Änderungen sehen auch andere Besucher.</div>
      )}
      <main>{children}</main>
    </>
  );
}
