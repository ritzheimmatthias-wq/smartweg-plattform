import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Einheit, Stimmabgabe } from "@/domain/abstimmung";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";

// Alle Abfragen nehmen die WEG-ID entgegen. Ob das Konto dazugehört, prüft
// vorher mitgliedschaft() in lib/auth.ts.

export async function wegsDesKontos(kontoId: string) {
  const db = await getDb();
  return db
    .select({ id: s.weg.id, name: s.weg.name, adresse: s.weg.adresse, rolle: s.mitglied.rolle })
    .from(s.mitglied)
    .innerJoin(s.weg, eq(s.weg.id, s.mitglied.wegId))
    .where(eq(s.mitglied.kontoId, kontoId))
    .orderBy(asc(s.weg.name));
}

export interface EinheitMitEigentuemern extends Einheit {
  namen: string[];
  personen: { id: string; name: string; email: string | null; hatZugang: boolean }[];
}

export async function einheitenDerWeg(wegId: string): Promise<EinheitMitEigentuemern[]> {
  const db = await getDb();
  const zeilen = await db
    .select({
      id: s.einheit.id,
      bezeichnung: s.einheit.bezeichnung,
      mea: s.einheit.mea,
      personId: s.person.id,
      name: s.person.name,
      email: s.person.email,
      kontoId: s.person.kontoId,
    })
    .from(s.einheit)
    .leftJoin(s.eigentum, eq(s.eigentum.einheitId, s.einheit.id))
    .leftJoin(s.person, eq(s.person.id, s.eigentum.personId))
    .where(eq(s.einheit.wegId, wegId))
    .orderBy(asc(s.einheit.sortierung), asc(s.person.name));

  const nachId = new Map<string, EinheitMitEigentuemern>();
  for (const z of zeilen) {
    const e = nachId.get(z.id) ?? { id: z.id, bezeichnung: z.bezeichnung, mea: z.mea, eigentuemer: [], namen: [], personen: [] };
    if (z.personId && z.name) {
      e.eigentuemer.push(z.personId);
      e.namen.push(z.name);
      e.personen.push({ id: z.personId, name: z.name, email: z.email, hatZugang: Boolean(z.kontoId) });
    }
    nachId.set(z.id, e);
  }
  return [...nachId.values()];
}

export async function versammlungenDerWeg(wegId: string) {
  const db = await getDb();
  return db.query.versammlung.findMany({
    where: eq(s.versammlung.wegId, wegId),
    orderBy: desc(s.versammlung.datum),
  });
}

export async function versammlungMitTops(wegId: string, id: string) {
  const db = await getDb();
  const v = await db.query.versammlung.findFirst({ where: and(eq(s.versammlung.id, id), eq(s.versammlung.wegId, wegId)) });
  if (!v) return null;
  const tops = await db.query.top.findMany({ where: eq(s.top.versammlungId, id), orderBy: asc(s.top.nummer) });
  return { ...v, tops };
}

export async function topMitStimmen(versammlungId: string, topId: string) {
  const db = await getDb();
  const t = await db.query.top.findFirst({ where: and(eq(s.top.id, topId), eq(s.top.versammlungId, versammlungId)) });
  if (!t) return null;
  const stimmen = await db.select().from(s.stimme).where(eq(s.stimme.topId, topId));
  const abgaben: Stimmabgabe[] = stimmen.map((x) => ({ einheitId: x.einheitId, wert: x.wert }));
  return { ...t, abgaben };
}

export async function beschluesseDerWeg(wegId: string) {
  const db = await getDb();
  return db.query.beschluss.findMany({ where: eq(s.beschluss.wegId, wegId), orderBy: desc(s.beschluss.nummer) });
}

export async function beschlussZuTop(topId: string) {
  const db = await getDb();
  return db.query.beschluss.findFirst({ where: eq(s.beschluss.topId, topId) });
}
