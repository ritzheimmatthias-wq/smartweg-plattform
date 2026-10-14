"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { hashePasswort, normalisiereEmail, pruefeEmail, pruefePasswort, pruefePasswortHash } from "@/domain/konto";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";
import { DEMO_KONTO_ID } from "@/db/seed";
import { beendeSitzung, starteSitzung, verknuepfeKonto } from "@/lib/auth";
import { fehler, text, type Zustand } from "@/lib/zustand";

export async function registrieren(_: Zustand, form: FormData): Promise<Zustand> {
  const name = text(form, "name");
  const email = normalisiereEmail(text(form, "email"));
  const passwort = String(form.get("passwort") ?? "");
  if (!name) return fehler("Bitte geben Sie Ihren Namen an.");
  const problem = pruefeEmail(email) ?? pruefePasswort(passwort);
  if (problem) return fehler(problem);

  const db = await getDb();
  const vorhanden = await db.query.konto.findFirst({ where: eq(s.konto.email, email) });
  if (vorhanden) return fehler("Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte melden Sie sich an.");

  const konto = { id: crypto.randomUUID(), email, name, passwortHash: await hashePasswort(passwort) };
  await db.insert(s.konto).values(konto);
  await verknuepfeKonto(db, konto);
  await starteSitzung(konto.id);
  redirect("/");
}

export async function anmelden(_: Zustand, form: FormData): Promise<Zustand> {
  const email = normalisiereEmail(text(form, "email"));
  const passwort = String(form.get("passwort") ?? "");
  const db = await getDb();
  const konto = await db.query.konto.findFirst({ where: eq(s.konto.email, email) });
  // Gleiche Meldung für unbekannte Adresse und falsches Passwort, damit niemand Konten ausprobieren kann.
  if (!konto || !(await pruefePasswortHash(passwort, konto.passwortHash))) {
    return fehler("E-Mail oder Passwort stimmen nicht.");
  }
  await verknuepfeKonto(db, konto);
  await starteSitzung(konto.id);
  redirect("/");
}

export async function beispielAnsehen(): Promise<void> {
  if (process.env.SMARTWEG_BEISPIEL === "aus") redirect("/anmelden");
  await starteSitzung(DEMO_KONTO_ID);
  redirect("/");
}

export async function abmelden(): Promise<void> {
  await beendeSitzung();
  redirect("/anmelden");
}
