"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { einladungstext, empfaenger } from "@/domain/einladung";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";
import { DEMO_WEG_ID } from "@/db/seed";
import { mitgliedschaft } from "@/lib/auth";
import { einheitenDerWeg, einladungenZurVersammlung, versammlungMitTops } from "@/lib/daten";
import { mailVersandEingerichtet, sendeMail } from "@/lib/mailer";
import { fehler, text, type Zustand } from "@/lib/zustand";

const NUR_VERWALTUNG = fehler("Nur die Verwaltung der Gemeinschaft kann Einladungen verschicken.");

async function basisUrl(): Promise<string> {
  if (process.env.SMARTWEG_URL) return process.env.SMARTWEG_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function versendeEinladungen(wegId: string, versammlungId: string, _: Zustand, __: FormData): Promise<Zustand> {
  const m = await mitgliedschaft(wegId);
  if (!m.darfBearbeiten) return NUR_VERWALTUNG;
  const v = await versammlungMitTops(wegId, versammlungId);
  if (!v) return fehler("Diese Versammlung gibt es nicht.");
  if (v.tops.length === 0) return fehler("Bitte legen Sie zuerst die Tagesordnung an. Die Einladung muss sie enthalten.");

  const liste = empfaenger(await einheitenDerWeg(wegId));
  if (liste.length === 0) return fehler("In dieser Gemeinschaft sind noch keine Eigentümer eingetragen.");

  const db = await getDb();
  const bisher = new Map((await einladungenZurVersammlung(versammlungId)).map((z) => [z.personId, z]));
  const testmodus = !mailVersandEingerichtet() || wegId === DEMO_WEG_ID;
  const basis = await basisUrl();
  const daten = {
    wegName: m.weg.name,
    wegAdresse: m.weg.adresse,
    titel: v.titel,
    datum: v.datum,
    uhrzeit: v.uhrzeit,
    ort: v.ort,
    onlineTeilnahme: v.onlineTeilnahme,
    tops: v.tops,
    absender: m.konto.name,
  };

  let mails = 0;
  let briefe = 0;
  let fehlgeschlagen = 0;
  for (const person of liste) {
    const alt = bisher.get(person.personId);
    // Verschickte Einladungen bleiben unverändert, sie sind der Nachweis.
    if (alt && alt.status === "versandt") continue;
    if (alt && !person.email && alt.versandweg === "post") continue;

    const token = alt?.token ?? randomBytes(18).toString("base64url");
    const { betreff, text: inhalt } = einladungstext(daten, person, `${basis}/einladung/${token}`);
    const felder = {
      name: person.name,
      email: person.email,
      einheiten: person.einheiten.join(", "),
      betreff,
      inhalt,
      testmodus,
    };

    let zeile;
    if (person.email) {
      const problem = testmodus ? null : await sendeMail({ an: person.email, antwortAn: m.konto.email, betreff, text: inhalt });
      if (problem) fehlgeschlagen++;
      else mails++;
      zeile = {
        ...felder,
        versandweg: "email" as const,
        status: problem ? ("fehler" as const) : ("versandt" as const),
        fehler: problem,
        versandtAm: problem ? null : new Date(),
      };
    } else {
      briefe++;
      zeile = { ...felder, versandweg: "post" as const, status: "offen" as const, fehler: null, versandtAm: null };
    }

    if (alt) await db.update(s.einladung).set(zeile).where(eq(s.einladung.id, alt.id));
    else await db.insert(s.einladung).values({ id: crypto.randomUUID(), versammlungId, personId: person.personId, token, ...zeile });
  }

  revalidatePath(`/weg/${wegId}`, "layout");

  const teile = [
    mails && `${mails} ${mails === 1 ? "E-Mail" : "E-Mails"} ${testmodus ? "im Testmodus erstellt" : "verschickt"}`,
    briefe && `${briefe} ${briefe === 1 ? "Brief" : "Briefe"} zum Ausdrucken vorbereitet`,
    fehlgeschlagen && `${fehlgeschlagen} nicht zugestellt`,
  ].filter(Boolean);
  if (teile.length === 0) return { hinweis: "Alle Eigentümer sind bereits eingeladen." };
  const satz = `${teile.join(", ")}.`;
  return fehlgeschlagen ? fehler(satz) : { hinweis: satz };
}

export async function vermerkeBrief(
  wegId: string,
  versammlungId: string,
  einladungId: string,
  _: Zustand,
  form: FormData,
): Promise<Zustand> {
  const m = await mitgliedschaft(wegId);
  if (!m.darfBearbeiten) return NUR_VERWALTUNG;
  const wert = text(form, "versandt");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return fehler("Bitte geben Sie an, wann der Brief zur Post ging.");
  const db = await getDb();
  await db
    .update(s.einladung)
    .set({ status: "versandt", versandtAm: new Date(`${wert}T00:00:00Z`) })
    .where(and(eq(s.einladung.id, einladungId), eq(s.einladung.versammlungId, versammlungId), eq(s.einladung.versandweg, "post")));
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}

/** Öffentlich: der Link aus der Einladung. Bestätigt wird erst per Klick, damit Linkvorschauen nichts auslösen. */
export async function bestaetigeEmpfang(token: string, _: Zustand, __: FormData): Promise<Zustand> {
  const db = await getDb();
  const [z] = await db
    .update(s.einladung)
    .set({ bestaetigtAm: new Date() })
    .where(and(eq(s.einladung.token, token), isNull(s.einladung.bestaetigtAm)))
    .returning({ versammlungId: s.einladung.versammlungId });
  if (z) revalidatePath("/", "layout");
  return { hinweis: "Vielen Dank, Ihr Empfang ist bestätigt." };
}
