"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Stimmrechtsprinzip } from "@/domain/abstimmung";
import { normalisiereEmail, pruefeEmail } from "@/domain/konto";
import { pruefeEinheit } from "@/domain/stammdaten";
import { getDb } from "@/db/client";
import * as s from "@/db/schema";
import { kontoErforderlich, mitgliedschaft } from "@/lib/auth";
import { fehler, text, type Zustand } from "@/lib/zustand";

const PRINZIPIEN: Stimmrechtsprinzip[] = ["kopf", "objekt", "mea"];

async function verwalterErforderlich(wegId: string) {
  const m = await mitgliedschaft(wegId);
  return m.darfBearbeiten ? null : fehler("Nur die Verwaltung der Gemeinschaft kann das ändern.");
}

export async function legeWegAn(_: Zustand, form: FormData): Promise<Zustand> {
  const konto = await kontoErforderlich();
  const name = text(form, "name");
  const adresse = text(form, "adresse");
  const prinzip = text(form, "prinzip") as Stimmrechtsprinzip;
  if (!name || !adresse) return fehler("Bitte geben Sie Name und Anschrift der Gemeinschaft an.");
  if (!PRINZIPIEN.includes(prinzip)) return fehler("Bitte wählen Sie das Stimmrechtsprinzip aus der Teilungserklärung.");

  const id = crypto.randomUUID();
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.insert(s.weg).values({ id, name, adresse, stimmrechtsprinzip: prinzip });
    await tx.insert(s.mitglied).values({ wegId: id, kontoId: konto.id, rolle: "verwalter" });
  });
  redirect(`/weg/${id}/einheiten`);
}

export async function speichereEinheit(wegId: string, einheitId: string | null, _: Zustand, form: FormData): Promise<Zustand> {
  const verboten = await verwalterErforderlich(wegId);
  if (verboten) return verboten;
  const eingabe = { bezeichnung: text(form, "bezeichnung"), mea: Number(text(form, "mea").replace(/\./g, "")) };
  const problem = pruefeEinheit(eingabe);
  if (problem) return fehler(problem);

  const db = await getDb();
  if (einheitId) {
    await db
      .update(s.einheit)
      .set(eingabe)
      .where(and(eq(s.einheit.id, einheitId), eq(s.einheit.wegId, wegId)));
  } else {
    const [{ n }] = await db.select({ n: count() }).from(s.einheit).where(eq(s.einheit.wegId, wegId));
    await db.insert(s.einheit).values({ id: crypto.randomUUID(), wegId, sortierung: n, ...eingabe });
  }
  revalidatePath(`/weg/${wegId}`, "layout");
  return einheitId ? { hinweis: "Gespeichert." } : {};
}

export async function loescheEinheit(wegId: string, einheitId: string, _: Zustand): Promise<Zustand> {
  const verboten = await verwalterErforderlich(wegId);
  if (verboten) return verboten;
  const db = await getDb();
  const einheit = await db.query.einheit.findFirst({ where: and(eq(s.einheit.id, einheitId), eq(s.einheit.wegId, wegId)) });
  if (!einheit) return fehler("Diese Einheit gibt es nicht.");
  const [{ n }] = await db.select({ n: count() }).from(s.stimme).where(eq(s.stimme.einheitId, einheitId));
  if (n > 0) return fehler("Für diese Einheit wurden bereits Stimmen erfasst. Sie bleibt deshalb erhalten.");

  const personen = await db.select({ id: s.eigentum.personId }).from(s.eigentum).where(eq(s.eigentum.einheitId, einheitId));
  await db.transaction(async (tx) => {
    await tx.delete(s.eigentum).where(eq(s.eigentum.einheitId, einheitId));
    await tx.delete(s.einheit).where(eq(s.einheit.id, einheitId));
    for (const p of personen) await raeumePersonAuf(tx, wegId, p.id);
  });
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}

export async function fuegeEigentuemerHinzu(wegId: string, einheitId: string, _: Zustand, form: FormData): Promise<Zustand> {
  const verboten = await verwalterErforderlich(wegId);
  if (verboten) return verboten;
  const name = text(form, "name");
  const email = text(form, "email") ? normalisiereEmail(text(form, "email")) : null;
  if (!name) return fehler("Bitte geben Sie den Namen der Eigentümerin oder des Eigentümers an.");
  if (email && pruefeEmail(email)) return fehler(pruefeEmail(email)!);

  const db = await getDb();
  const einheit = await db.query.einheit.findFirst({ where: and(eq(s.einheit.id, einheitId), eq(s.einheit.wegId, wegId)) });
  if (!einheit) return fehler("Diese Einheit gibt es nicht.");

  await db.transaction(async (tx) => {
    // Wer mehrere Einheiten besitzt, ist eine Person mit mehreren Eigentumsrechten (wichtig fürs Kopfprinzip).
    let person = email
      ? await tx.query.person.findFirst({ where: and(eq(s.person.wegId, wegId), sql`lower(${s.person.email}) = ${email}`) })
      : undefined;
    if (!person) {
      const konto = email ? await tx.query.konto.findFirst({ where: eq(s.konto.email, email) }) : undefined;
      person = { id: crypto.randomUUID(), wegId, name, email, kontoId: konto?.id ?? null };
      await tx.insert(s.person).values(person);
      if (konto) {
        await tx.insert(s.mitglied).values({ wegId, kontoId: konto.id, rolle: "eigentuemer" }).onConflictDoNothing();
      }
    }
    await tx.insert(s.eigentum).values({ einheitId, personId: person.id }).onConflictDoNothing();
  });
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}

export async function entferneEigentuemer(wegId: string, einheitId: string, personId: string, _: Zustand): Promise<Zustand> {
  const verboten = await verwalterErforderlich(wegId);
  if (verboten) return verboten;
  const db = await getDb();
  const einheit = await db.query.einheit.findFirst({ where: and(eq(s.einheit.id, einheitId), eq(s.einheit.wegId, wegId)) });
  if (!einheit) return fehler("Diese Einheit gibt es nicht.");
  await db.transaction(async (tx) => {
    await tx.delete(s.eigentum).where(and(eq(s.eigentum.einheitId, einheitId), eq(s.eigentum.personId, personId)));
    await raeumePersonAuf(tx, wegId, personId);
  });
  revalidatePath(`/weg/${wegId}`, "layout");
  return {};
}

type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

/** Entfernt eine Person ohne Einheit und nimmt ihrem Konto den Eigentümerzugang zu dieser WEG. */
async function raeumePersonAuf(tx: Tx, wegId: string, personId: string) {
  const [{ n }] = await tx.select({ n: count() }).from(s.eigentum).where(eq(s.eigentum.personId, personId));
  if (n > 0) return;
  const [person] = await tx.delete(s.person).where(and(eq(s.person.id, personId), eq(s.person.wegId, wegId))).returning();
  if (person?.kontoId) {
    await tx
      .delete(s.mitglied)
      .where(and(eq(s.mitglied.wegId, wegId), eq(s.mitglied.kontoId, person.kontoId), eq(s.mitglied.rolle, "eigentuemer")));
  }
}
