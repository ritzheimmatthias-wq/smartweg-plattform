"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Abstimmungsfehler, type Mehrheit, type Stimmwert, zaehleStimmen } from "@/domain/abstimmung";
import { pruefeWortlaut } from "@/domain/beschlusssammlung";
import type { Versandweg } from "@/domain/fristen";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";
import { aktuelleWeg, einheitenDerWeg, topMitStimmen } from "./daten";

function text(form: FormData, feld: string): string {
  return String(form.get(feld) ?? "").trim();
}

function datum(form: FormData, feld: string): Date | null {
  const wert = text(form, feld);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return null;
  const d = new Date(`${wert}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface Zustand {
  fehler?: string;
}

const fehler = (text: string): Zustand => ({ fehler: text });

export async function legeVersammlungAn(_: Zustand, form: FormData): Promise<Zustand> {
  const weg = await aktuelleWeg();
  const titel = text(form, "titel");
  const tag = datum(form, "datum");
  const uhrzeit = text(form, "uhrzeit");
  const ort = text(form, "ort");
  if (!titel || !tag || !/^\d{2}:\d{2}$/.test(uhrzeit) || !ort) {
    return fehler("Bitte füllen Sie Titel, Datum, Uhrzeit und Ort aus.");
  }
  const id = crypto.randomUUID();
  const db = await getDb();
  await db.insert(s.versammlung).values({
    id,
    wegId: weg.id,
    titel,
    datum: tag,
    uhrzeit,
    ort,
    onlineTeilnahme: form.get("online") === "on",
    versandweg: text(form, "versandweg") === "post" ? "post" : "email",
  });
  revalidatePath("/versammlungen");
  redirect(`/versammlungen/${id}`);
}

export async function vermerkeEinladung(versammlungId: string, _: Zustand, form: FormData): Promise<Zustand> {
  const pfad = `/versammlungen/${versammlungId}`;
  const versandt = datum(form, "versandt");
  if (!versandt) return fehler("Bitte geben Sie das Versanddatum an.");
  const weg: Versandweg = text(form, "versandweg") === "post" ? "post" : "email";
  const db = await getDb();
  await db
    .update(s.versammlung)
    .set({ einladungVersandtAm: versandt, versandweg: weg })
    .where(eq(s.versammlung.id, versammlungId));
  revalidatePath(pfad);
  redirect(pfad);
}

export async function fuegeTopHinzu(versammlungId: string, _: Zustand, form: FormData): Promise<Zustand> {
  const pfad = `/versammlungen/${versammlungId}`;
  const titel = text(form, "titel");
  const antrag = text(form, "beschlussantrag");
  const mehrheit: Mehrheit = text(form, "mehrheit") === "zweiDrittelUndHalbeMea" ? "zweiDrittelUndHalbeMea" : "einfach";
  if (!titel) return fehler("Bitte geben Sie dem Tagesordnungspunkt einen Titel.");
  const wortlautFehler = pruefeWortlaut(antrag);
  if (wortlautFehler) return fehler(wortlautFehler);

  const db = await getDb();
  const [{ hoechste }] = await db
    .select({ hoechste: max(s.top.nummer) })
    .from(s.top)
    .where(eq(s.top.versammlungId, versammlungId));
  await db.insert(s.top).values({
    id: crypto.randomUUID(),
    versammlungId,
    nummer: (hoechste ?? 0) + 1,
    titel,
    beschlussantrag: antrag,
    mehrheit,
  });
  revalidatePath(pfad);
  redirect(pfad);
}

const WERTE: Stimmwert[] = ["ja", "nein", "enthaltung"];

export async function speichereStimmen(versammlungId: string, topId: string, _: Zustand, form: FormData): Promise<Zustand> {
  const pfad = `/versammlungen/${versammlungId}/top/${topId}`;
  const top = await topMitStimmen(topId);
  if (!top) return fehler("Diesen Tagesordnungspunkt gibt es nicht.");
  if (top.verkuendetAm) return fehler("Der Beschluss ist bereits verkündet. Stimmen lassen sich nicht mehr ändern.");

  const weg = await aktuelleWeg();
  const einheiten = await einheitenDerWeg(weg.id);
  const abgaben = einheiten.flatMap((e) => {
    const wert = text(form, `stimme-${e.id}`) as Stimmwert;
    return WERTE.includes(wert) ? [{ einheitId: e.id, wert }] : [];
  });

  try {
    zaehleStimmen(einheiten, abgaben, weg.stimmrechtsprinzip, top.mehrheit);
  } catch (e) {
    if (e instanceof Abstimmungsfehler) return fehler(e.message);
    throw e;
  }

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(s.stimme).where(eq(s.stimme.topId, topId));
    if (abgaben.length) await tx.insert(s.stimme).values(abgaben.map((a) => ({ topId, ...a })));
  });
  revalidatePath(pfad);
  redirect(pfad);
}

export async function verkuendeBeschluss(versammlungId: string, topId: string, _: Zustand): Promise<Zustand> {
  const pfad = `/versammlungen/${versammlungId}/top/${topId}`;
  const weg = await aktuelleWeg();
  const db = await getDb();
  const versammlung = await db.query.versammlung.findFirst({ where: eq(s.versammlung.id, versammlungId) });
  const top = await topMitStimmen(topId);
  if (!versammlung || !top) return fehler("Diesen Tagesordnungspunkt gibt es nicht.");
  if (top.verkuendetAm) return fehler("Der Beschluss ist bereits verkündet.");
  if (top.abgaben.length === 0) return fehler("Es wurden noch keine Stimmen erfasst.");

  const einheiten = await einheitenDerWeg(weg.id);
  const ergebnis = zaehleStimmen(einheiten, top.abgaben, weg.stimmrechtsprinzip, top.mehrheit);

  await db.transaction(async (tx) => {
    const [{ hoechste }] = await tx
      .select({ hoechste: max(s.beschluss.nummer) })
      .from(s.beschluss)
      .where(eq(s.beschluss.wegId, weg.id));
    await tx.insert(s.beschluss).values({
      id: crypto.randomUUID(),
      wegId: weg.id,
      topId,
      nummer: (hoechste ?? 0) + 1,
      wortlaut: top.beschlussantrag,
      ort: versammlung.ort,
      datum: versammlung.datum,
      angenommen: ergebnis.angenommen,
      ergebnis: { ja: ergebnis.ja, nein: ergebnis.nein, enthaltung: ergebnis.enthaltung, prinzip: ergebnis.prinzip },
    });
    await tx
      .update(s.top)
      .set({ verkuendetAm: new Date() })
      .where(and(eq(s.top.id, topId), eq(s.top.versammlungId, versammlungId)));
  });
  revalidatePath(pfad);
  revalidatePath("/beschluesse");
  redirect(pfad);
}
