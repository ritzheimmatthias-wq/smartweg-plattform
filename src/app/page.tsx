import Link from "next/link";
import { kontoErforderlich } from "@/lib/auth";
import { wegsDesKontos } from "@/lib/daten";

export default async function MeineGemeinschaften() {
  const konto = await kontoErforderlich();
  const wegs = await wegsDesKontos(konto.id);

  return (
    <main>
      <div className="seitenkopf">
        <p className="eyebrow">Willkommen, {konto.name}</p>
        <h1>
          <span className="light">Meine</span> Gemeinschaften
        </h1>
      </div>

      {wegs.length === 0 ? (
        <section className="flaeche">
          <h2>Noch keine Gemeinschaft</h2>
          <p>
            Legen Sie Ihre WEG an, wenn Sie sie selbst verwalten. Sind Sie Eigentümer und wurden eingeladen, bitten Sie Ihre
            Verwaltung, Ihre E-Mail-Adresse <strong>{konto.email}</strong> bei Ihrer Einheit zu hinterlegen.
          </p>
          <Link className="knopf primaer" href="/weg/neu">
            Gemeinschaft anlegen
          </Link>
        </section>
      ) : (
        <section className="flaeche">
          <ul className="liste">
            {wegs.map((w) => (
              <li key={w.id}>
                <Link href={`/weg/${w.id}`}>{w.name}</Link>
                <span className="klein">
                  {w.adresse} · {w.rolle === "verwalter" ? "Verwaltung" : "Eigentümer"}
                </span>
              </li>
            ))}
          </ul>
          <Link className="knopf" href="/weg/neu">
            Weitere Gemeinschaft anlegen
          </Link>
        </section>
      )}
    </main>
  );
}
