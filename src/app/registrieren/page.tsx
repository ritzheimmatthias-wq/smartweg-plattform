import Link from "next/link";
import { redirect } from "next/navigation";
import { AktionsFormular } from "@/components/aktions-formular";
import { MIN_PASSWORT_LAENGE } from "@/domain/konto";
import { registrieren } from "@/lib/aktionen/konto";
import { aktuellesKonto } from "@/lib/auth";

export default async function Registrieren() {
  if (await aktuellesKonto()) redirect("/");
  return (
    <main className="schmal">
      <div className="seitenkopf">
        <p className="eyebrow">Registrieren</p>
        <h1>
          <span className="light">Konto</span> anlegen
        </h1>
        <p>
          Als Eigentümer verwenden Sie die E-Mail-Adresse, die Ihre Verwaltung hinterlegt hat. Dann sehen Sie Ihre
          Gemeinschaft sofort nach der Registrierung.
        </p>
      </div>
      <section className="flaeche">
        <AktionsFormular className="formular" aktion={registrieren}>
          <label>
            Name
            <input id="r-name" name="name" autoComplete="name" required />
          </label>
          <label>
            E-Mail
            <input id="r-email" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Passwort (mindestens {MIN_PASSWORT_LAENGE} Zeichen)
            <input
              id="r-passwort"
              name="passwort"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORT_LAENGE}
              required
            />
          </label>
          <button className="knopf primaer" type="submit">
            Konto anlegen
          </button>
        </AktionsFormular>
        <p className="klein">
          Schon registriert? <Link href="/anmelden">Anmelden</Link>
        </p>
      </section>
    </main>
  );
}
