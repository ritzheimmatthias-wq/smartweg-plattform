"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Abstimmungsfehler, type Mehrheit, type Stimmwert, zaehleStimmen } from "@/domain/abstimmung";
import { pruefeWortlaut } from "@/domain/beschlusssammlung";
import type { Versandweg } from "@/domain/fristen";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";
import { mitgliedschaft } from "@/lib/auth";
import { einheitenDerWeg, topMitStimmen, versammlungMitTops } from "@/lib/daten";
import { fehler, text, type Zustand } from "@/lib/zustand";

function datum(form: FormData, feld: string): Date | null {
  const wert = text(form, feld);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return null;
  const d = new Date(`${wert}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Schreibende Aktionen sind der Verwaltung vorbehalten; Eigentümer lesen nur. */
async function verwaltung(wegId: string) {
  const m = await mitgliedschaft(wegId);
  return m.darfBearbeiten ? m : null;
}

const NUR_VERWALTUNG = fehler("Nur die Verwaltung der Gemeinschaft kann das ändern.");

export async function legeVersammlungAn(wegId: string, _: Zustand, form: FormData): Promise<Zustand> {
  if (!(await verwaltung(wegId))) return NUR_VERWALTUNG;
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
    wegId,
    titel,
    datum: tag,
    uhrzeit,
    ort,
    onlineTeilnahme: form.get("online") === "on",
    versandweg: text(form, "versandweg") === "post" ? "post" : "email",
  });
  revalidatePath(`/weg/${wegId}`, "layout");
  redirect(`/weg/${wegId}/versammlungen/${id}`);
}

export async function vermerkeEinladung(wegId: string, versammlungId: string, _: Zustand, form: FormData): Promise<Zustand> {
  if (!(await verwaltung(wegId))) return NUR_VERWALTUNG;
  const versandt = datum(form, "versandt");
  if (!versandt) return fehler("Bitte geben Sie das Versanddatum an.");
  const weg: Versandweg = text(form, "versandweg") === "post" ? "post" : "email";
  const db = await getDb();
  await db
    .update(s.versammlung)
    .set({ einladungVersandtAm: versandt, versandweg: weg })
    .where(and(eq(s.versammlung.id, versammlungId), eq(s.versammlung.wegId, wegId)));
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}

export async function fuegeTopHinzu(wegId: string, versammlungId: string, _: Zustand, form: FormData): Promise<Zustand> {
  if (!(await verwaltung(wegId))) return NUR_VERWALTUNG;
  if (!(await versammlungMitTops(wegId, versammlungId))) return fehler("Diese Versammlung gibt es nicht.");
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
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}

const WERTE: Stimmwert[] = ["ja", "nein", "enthaltung"];

export async function speichereStimmen(
  wegId: string,
  versammlungId: string,
  topId: string,
  _: Zustand,
  form: FormData,
): Promise<Zustand> {
  const m = await verwaltung(wegId);
  if (!m) return NUR_VERWALTUNG;
  if (!(await versammlungMitTops(wegId, versammlungId))) return fehler("Diese Versammlung gibt es nicht.");
  const top = await topMitStimmen(versammlungId, topId);
  if (!top) return fehler("Diesen Tagesordnungspunkt gibt es nicht.");
  if (top.verkuendetAm) return fehler("Der Beschluss ist bereits verkündet. Stimmen lassen sich nicht mehr ändern.");

  const einheiten = await einheitenDerWeg(wegId);
  const abgaben = einheiten.flatMap((e) => {
    const wert = text(form, `stimme-${e.id}`) as Stimmwert;
    return WERTE.includes(wert) ? [{ einheitId: e.id, wert }] : [];
  });

  try {
    zaehleStimmen(einheiten, abgaben, m.weg.stimmrechtsprinzip, top.mehrheit);
  } catch (e) {
    if (e instanceof Abstimmungsfehler) return fehler(e.message);
    throw e;
  }

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(s.stimme).where(eq(s.stimme.topId, topId));
    if (abgaben.length) await tx.insert(s.stimme).values(abgaben.map((a) => ({ topId, ...a })));
  });
  revalidatePath(`/weg/${wegId}`, "layout");
  return { hinweis: "Stimmen gespeichert." };
}

export async function verkuendeBeschluss(wegId: string, versammlungId: string, topId: string, _: Zustand): Promise<Zustand> {
  const m = await verwaltung(wegId);
  if (!m) return NUR_VERWALTUNG;
  const versammlung = await versammlungMitTops(wegId, versammlungId);
  const top = versammlung ? await topMitStimmen(versammlungId, topId) : null;
  if (!versammlung || !top) return fehler("Diesen Tagesordnungspunkt gibt es nicht.");
  if (top.verkuendetAm) return fehler("Der Beschluss ist bereits verkündet.");
  if (top.abgaben.length === 0) return fehler("Es wurden noch keine Stimmen erfasst.");

  const einheiten = await einheitenDerWeg(wegId);
  const ergebnis = zaehleStimmen(einheiten, top.abgaben, m.weg.stimmrechtsprinzip, top.mehrheit);

  const db = await getDb();
  await db.transaction(async (tx) => {
    const [{ hoechste }] = await tx
      .select({ hoechste: max(s.beschluss.nummer) })
      .from(s.beschluss)
      .where(eq(s.beschluss.wegId, wegId));
    await tx.insert(s.beschluss).values({
      id: crypto.randomUUID(),
      wegId,
      topId,
      nummer: (hoechste ?? 0) + 1,
      wortlaut: top.beschlussantrag,
      ort: versammlung.ort,
      datum: versammlung.datum,
      angenommen: ergebnis.angenommen,
      ergebnis: { ja: ergebnis.ja, nein: ergebnis.nein, enthaltung: ergebnis.enthaltung, prinzip: ergebnis.prinzip },
    });
    await tx.update(s.top).set({ verkuendetAm: new Date() }).where(eq(s.top.id, topId));
  });
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}
