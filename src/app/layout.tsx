import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Montserrat } from "next/font/google";
import Link from "next/link";
import { abmelden } from "@/lib/aktionen/konto";
import { aktuellesKonto } from "@/lib/auth";
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
  const konto = await aktuellesKonto();
  return (
    <html lang="de" className={`${montserrat.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <header className="kopf">
          <div className="kopf-inner">
            <Link className="logo" href="/" aria-label="smartWEG Startseite">
              <Logo />
            </Link>
            {konto && (
              <div className="konto">
                <span>{konto.name}</span>
                <form action={abmelden}>
                  <button type="submit" className="link-knopf">
                    Abmelden
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
