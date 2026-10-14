import Link from "next/link";
import { redirect } from "next/navigation";
import { AktionsFormular } from "@/components/aktions-formular";
import { anmelden, beispielAnsehen } from "@/lib/aktionen/konto";
import { aktuellesKonto } from "@/lib/auth";

export default async function Anmelden() {
  if (await aktuellesKonto()) redirect("/");
  const beispiel = process.env.SMARTWEG_BEISPIEL !== "aus";
  return (
    <main className="schmal">
      <div className="seitenkopf">
        <p className="eyebrow">Anmelden</p>
        <h1>
          <span className="light">Willkommen</span> zurück
        </h1>
      </div>
      <section className="flaeche">
        <AktionsFormular className="formular" aktion={anmelden}>
          <label>
            E-Mail
            <input id="a-email" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Passwort
            <input id="a-passwort" name="passwort" type="password" autoComplete="current-password" required />
          </label>
          <button className="knopf primaer" type="submit">
            Anmelden
          </button>
        </AktionsFormular>
        <p className="klein">
          Noch kein Konto? <Link href="/registrieren">Jetzt registrieren</Link>
        </p>
      </section>
      {beispiel && (
        <section className="flaeche">
          <h2>Erst einmal umsehen</h2>
          <p>Öffnen Sie die Beispiel-Gemeinschaft Lindenstraße 12 mit sechs Einheiten, einer Versammlung und Beschlüssen.</p>
          <form action={beispielAnsehen}>
            <button className="knopf" type="submit">
              Beispiel ansehen
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
