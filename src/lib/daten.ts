import { asc, desc, eq } from "drizzle-orm";
import type { Einheit, Stimmabgabe } from "@/domain/abstimmung";
import { getDb } from "@/db/client";
import { DEMO_WEG_ID } from "@/db/seed";
import * as s from "@/db/schema";

/** Solange es keine Anmeldung gibt, arbeitet die Oberfläche mit der Beispiel-WEG. */
export async function aktuelleWeg() {
  const db = await getDb();
  const w = await db.query.weg.findFirst({ where: eq(s.weg.id, DEMO_WEG_ID) });
  if (!w) throw new Error("Beispiel-WEG fehlt in der Datenbank");
  return w;
}

export interface EinheitMitEigentuemern extends Einheit {
  namen: string[];
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
    })
    .from(s.einheit)
    .leftJoin(s.eigentum, eq(s.eigentum.einheitId, s.einheit.id))
    .leftJoin(s.person, eq(s.person.id, s.eigentum.personId))
    .where(eq(s.einheit.wegId, wegId))
    .orderBy(asc(s.einheit.sortierung), asc(s.person.name));

  const nachId = new Map<string, EinheitMitEigentuemern>();
  for (const z of zeilen) {
    const e = nachId.get(z.id) ?? { id: z.id, bezeichnung: z.bezeichnung, mea: z.mea, eigentuemer: [], namen: [] };
    if (z.personId && z.name) {
      e.eigentuemer.push(z.personId);
      e.namen.push(z.name);
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

export async function versammlungMitTops(id: string) {
  const db = await getDb();
  const v = await db.query.versammlung.findFirst({ where: eq(s.versammlung.id, id) });
  if (!v) return null;
  const tops = await db.query.top.findMany({ where: eq(s.top.versammlungId, id), orderBy: asc(s.top.nummer) });
  return { ...v, tops };
}

export async function topMitStimmen(topId: string) {
  const db = await getDb();
  const t = await db.query.top.findFirst({ where: eq(s.top.id, topId) });
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
