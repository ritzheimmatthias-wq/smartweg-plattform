import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Montserrat } from "next/font/google";
import Link from "next/link";
import { aktuelleWeg } from "@/lib/daten";
import Logo from "./logo";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "800"], variable: "--font-montserrat" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "smartWEG",
  description: "Versammlung, Beschlüsse und Eigentümer Ihrer WEG in einem System.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const weg = await aktuelleWeg();
  return (
    <html lang="de" className={`${montserrat.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <header className="kopf">
          <div className="kopf-inner">
            <Link className="logo" href="/" aria-label="smartWEG Übersicht">
              <Logo />
            </Link>
            <nav aria-label="Hauptnavigation">
              <Link href="/">Übersicht</Link>
              <Link href="/versammlungen">Versammlungen</Link>
              <Link href="/beschluesse">Beschlusssammlung</Link>
            </nav>
            <span className="weg">{weg.name}</span>
          </div>
        </header>
        <div className="demo">Vorschau mit der Beispiel-Gemeinschaft Lindenstraße 12. Anmeldung und eigene WEGs folgen.</div>
        <main>{children}</main>
      </body>
    </html>
  );
}
