import { count } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as s from "./schema";

export const DEMO_WEG_ID = "lindenstrasse-12";
export const DEMO_KONTO_ID = "demo";

/**
 * Legt die Beispiel-Gemeinschaft „Lindenstraße 12“ an, wenn die Datenbank leer
 * ist. Alle Namen sind erfunden.
 */
export async function seedDemo(db: PgliteDatabase<typeof s>): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(s.weg);
  if (n > 0) return;

  await db.transaction(async (tx) => {
    await tx.insert(s.weg).values({
      id: DEMO_WEG_ID,
      name: "WEG Lindenstraße 12",
      adresse: "Lindenstraße 12, 50674 Köln",
      stimmrechtsprinzip: "mea",
    });

    // Das Beispielkonto hat kein gültiges Passwort; man betritt es nur über „Beispiel ansehen“.
    await tx.insert(s.konto).values({
      id: DEMO_KONTO_ID,
      email: "beispiel@smartweg.invalid",
      name: "Petra Brandt (Beispiel)",
      passwortHash: "gesperrt",
    });
    await tx.insert(s.mitglied).values({ wegId: DEMO_WEG_ID, kontoId: DEMO_KONTO_ID, rolle: "verwalter" });

    await tx.insert(s.person).values(
      [
        { id: "keller", name: "Ursula Keller", email: "u.keller@example.org" },
        { id: "yilmaz", name: "Deniz Yılmaz", email: "d.yilmaz@example.org" },
        { id: "weber-j", name: "Jonas Weber", email: "j.weber@example.org" },
        { id: "weber-a", name: "Anna Weber", email: "a.weber@example.org" },
        { id: "brandt", name: "Petra Brandt", email: "p.brandt@example.org", kontoId: DEMO_KONTO_ID },
        { id: "novak", name: "Milan Novak", email: "m.novak@example.org" },
      ].map((p) => ({ ...p, wegId: DEMO_WEG_ID })),
    );

    const einheiten = [
      { id: "eg-li", bezeichnung: "EG links", mea: 168, eigentuemer: ["keller"] },
      { id: "eg-re", bezeichnung: "EG rechts", mea: 152, eigentuemer: ["yilmaz"] },
      { id: "1og-li", bezeichnung: "1. OG links", mea: 171, eigentuemer: ["weber-j", "weber-a"] },
      { id: "1og-re", bezeichnung: "1. OG rechts", mea: 158, eigentuemer: ["weber-j", "weber-a"] },
      { id: "2og-li", bezeichnung: "2. OG links", mea: 186, eigentuemer: ["brandt"] },
      { id: "2og-re", bezeichnung: "2. OG rechts", mea: 165, eigentuemer: ["novak"] },
    ];
    await tx.insert(s.einheit).values(
      einheiten.map((e, i) => ({ id: e.id, wegId: DEMO_WEG_ID, bezeichnung: e.bezeichnung, mea: e.mea, sortierung: i })),
    );
    await tx
      .insert(s.eigentum)
      .values(einheiten.flatMap((e) => e.eigentuemer.map((personId) => ({ einheitId: e.id, personId }))));

    await tx.insert(s.versammlung).values({
      id: "etv-2026",
      wegId: DEMO_WEG_ID,
      titel: "Ordentliche Eigentümerversammlung 2026",
      datum: new Date("2026-11-26"),
      uhrzeit: "19:00",
      ort: "Gemeinschaftsraum im Souterrain, Lindenstraße 12",
      onlineTeilnahme: true,
      versandweg: "email",
    });

    await tx.insert(s.top).values([
      {
        id: "etv-2026-top-1",
        versammlungId: "etv-2026",
        nummer: 1,
        titel: "Jahresabrechnung 2025",
        beschlussantrag:
          "Die Nachschüsse und Anpassungen der Vorschüsse aus der Jahresabrechnung 2025 vom 12.10.2026 werden beschlossen.",
      },
      {
        id: "etv-2026-top-2",
        versammlungId: "etv-2026",
        nummer: 2,
        titel: "Wirtschaftsplan 2027",
        beschlussantrag:
          "Die Vorschüsse zur Kostentragung und zur Erhaltungsrücklage werden gemäß Wirtschaftsplan 2027 vom 12.10.2026 beschlossen.",
      },
      {
        id: "etv-2026-top-3",
        versammlungId: "etv-2026",
        nummer: 3,
        titel: "Erneuerung der Dachrinne",
        beschlussantrag:
          "Die Dachrinne an der Straßenseite wird nach Angebot der Dachdeckerei Holm vom 02.09.2026 für bis zu 4.800 € brutto erneuert. Die Kosten werden der Erhaltungsrücklage entnommen.",
      },
    ]);

    await tx.insert(s.beschluss).values([
      {
        id: "b-2025-1",
        wegId: DEMO_WEG_ID,
        nummer: 1,
        wortlaut: "Die Online-Teilnahme an Eigentümerversammlungen wird nach § 23 Abs. 1a WEG zugelassen.",
        ort: "Gemeinschaftsraum, Lindenstraße 12",
        datum: new Date("2025-11-20"),
        angenommen: true,
        ergebnis: { ja: 848, nein: 0, enthaltung: 152, prinzip: "mea" },
      },
      {
        id: "b-2025-2",
        wegId: DEMO_WEG_ID,
        nummer: 2,
        wortlaut: "Ursula Keller und Milan Novak werden für drei Jahre in den Verwaltungsbeirat gewählt.",
        ort: "Gemeinschaftsraum, Lindenstraße 12",
        datum: new Date("2025-11-20"),
        angenommen: true,
        ergebnis: { ja: 1000, nein: 0, enthaltung: 0, prinzip: "mea" },
      },
    ]);
  });
}
