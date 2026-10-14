import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { hashToken, neuesSitzungstoken, normalisiereEmail } from "@/domain/konto";
import { type Db, getDb } from "@/db/client";
import * as s from "@/db/schema";

export const SITZUNG_COOKIE = "smartweg_sitzung";
const SITZUNG_TAGE = 30;

export type Konto = typeof s.konto.$inferSelect;

export async function starteSitzung(kontoId: string): Promise<void> {
  const db = await getDb();
  const { token, hash } = neuesSitzungstoken();
  const laeuftAb = new Date(Date.now() + SITZUNG_TAGE * 24 * 60 * 60 * 1000);
  await db.insert(s.sitzung).values({ tokenHash: hash, kontoId, laeuftAb });
  (await cookies()).set(SITZUNG_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: laeuftAb,
  });
}

export async function beendeSitzung(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SITZUNG_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(s.sitzung).where(eq(s.sitzung.tokenHash, hashToken(token)));
  }
  jar.delete(SITZUNG_COOKIE);
}

/** Das angemeldete Konto oder null. Einmal pro Anfrage aus der Datenbank gelesen. */
export const aktuellesKonto = cache(async (): Promise<Konto | null> => {
  const token = (await cookies()).get(SITZUNG_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [zeile] = await db
    .select({ konto: s.konto })
    .from(s.sitzung)
    .innerJoin(s.konto, eq(s.konto.id, s.sitzung.kontoId))
    .where(and(eq(s.sitzung.tokenHash, hashToken(token)), gt(s.sitzung.laeuftAb, new Date())));
  return zeile?.konto ?? null;
});

export async function kontoErforderlich(): Promise<Konto> {
  const konto = await aktuellesKonto();
  if (!konto) redirect("/anmelden");
  return konto;
}

/**
 * Prüft, ob das angemeldete Konto zur WEG gehört. Fremde WEGs sehen für
 * Außenstehende genauso aus wie nicht vorhandene (404).
 */
export const mitgliedschaft = cache(async (wegId: string) => {
  const konto = await kontoErforderlich();
  const db = await getDb();
  const [zeile] = await db
    .select({ weg: s.weg, rolle: s.mitglied.rolle })
    .from(s.mitglied)
    .innerJoin(s.weg, eq(s.weg.id, s.mitglied.wegId))
    .where(and(eq(s.mitglied.wegId, wegId), eq(s.mitglied.kontoId, konto.id)));
  if (!zeile) notFound();
  return { konto, weg: zeile.weg, rolle: zeile.rolle, darfBearbeiten: zeile.rolle === "verwalter" };
});

/**
 * Verknüpft ein Konto mit allen Eigentümer-Einträgen, die dieselbe E-Mail
 * tragen, und macht es dort zum Mitglied. So erhalten Eigentümer Zugang,
 * sobald sie sich mit der Adresse registrieren, die der Verwalter hinterlegt hat.
 */
export async function verknuepfeKonto(db: Db, konto: Pick<Konto, "id" | "email">): Promise<void> {
  const email = normalisiereEmail(konto.email);
  const treffer = await db
    .update(s.person)
    .set({ kontoId: konto.id })
    .where(and(isNull(s.person.kontoId), sql`lower(${s.person.email}) = ${email}`))
    .returning({ wegId: s.person.wegId });
  const wegIds = [...new Set(treffer.map((t) => t.wegId))];
  if (wegIds.length) {
    await db
      .insert(s.mitglied)
      .values(wegIds.map((wegId) => ({ wegId, kontoId: konto.id, rolle: "eigentuemer" as const })))
      .onConflictDoNothing();
  }
}
