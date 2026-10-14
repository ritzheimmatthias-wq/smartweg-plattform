import { boolean, date, integer, jsonb, pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { Mehrheit, Stimmrechtsprinzip, Stimmwert } from "@/domain/abstimmung";
import type { Versandweg } from "@/domain/fristen";

export const weg = pgTable("weg", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  adresse: text("adresse").notNull(),
  stimmrechtsprinzip: text("stimmrechtsprinzip").$type<Stimmrechtsprinzip>().notNull().default("kopf"),
});

export const konto = pgTable("konto", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwortHash: text("passwort_hash").notNull(),
  erstelltAm: timestamp("erstellt_am", { mode: "date" }).notNull().defaultNow(),
});

export const sitzung = pgTable("sitzung", {
  tokenHash: text("token_hash").primaryKey(),
  kontoId: text("konto_id").notNull().references(() => konto.id),
  laeuftAb: timestamp("laeuft_ab", { mode: "date" }).notNull(),
});

export type Rolle = "verwalter" | "eigentuemer";

export const mitglied = pgTable(
  "mitglied",
  {
    wegId: text("weg_id").notNull().references(() => weg.id),
    kontoId: text("konto_id").notNull().references(() => konto.id),
    rolle: text("rolle").$type<Rolle>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.wegId, t.kontoId] })],
);

/** Eigentümer einer Einheit. Mit einem Konto verknüpft, sobald sich jemand mit derselben E-Mail anmeldet. */
export const person = pgTable("person", {
  id: text("id").primaryKey(),
  wegId: text("weg_id").notNull().references(() => weg.id),
  kontoId: text("konto_id").references(() => konto.id),
  name: text("name").notNull(),
  email: text("email"),
});

export const einheit = pgTable("einheit", {
  id: text("id").primaryKey(),
  wegId: text("weg_id").notNull().references(() => weg.id),
  bezeichnung: text("bezeichnung").notNull(),
  mea: integer("mea").notNull(),
  sortierung: integer("sortierung").notNull().default(0),
});

export const eigentum = pgTable(
  "eigentum",
  {
    einheitId: text("einheit_id").notNull().references(() => einheit.id),
    personId: text("person_id").notNull().references(() => person.id),
  },
  (t) => [primaryKey({ columns: [t.einheitId, t.personId] })],
);

export const versammlung = pgTable("versammlung", {
  id: text("id").primaryKey(),
  wegId: text("weg_id").notNull().references(() => weg.id),
  titel: text("titel").notNull(),
  datum: date("datum", { mode: "date" }).notNull(),
  uhrzeit: text("uhrzeit").notNull(),
  ort: text("ort").notNull(),
  onlineTeilnahme: boolean("online_teilnahme").notNull().default(false),
  versandweg: text("versandweg").$type<Versandweg>().notNull().default("email"),
  einladungVersandtAm: date("einladung_versandt_am", { mode: "date" }),
});

export const top = pgTable("top", {
  id: text("id").primaryKey(),
  versammlungId: text("versammlung_id").notNull().references(() => versammlung.id),
  nummer: integer("nummer").notNull(),
  titel: text("titel").notNull(),
  beschlussantrag: text("beschlussantrag").notNull(),
  mehrheit: text("mehrheit").$type<Mehrheit>().notNull().default("einfach"),
  verkuendetAm: timestamp("verkuendet_am", { mode: "date" }),
});

export const stimme = pgTable(
  "stimme",
  {
    topId: text("top_id").notNull().references(() => top.id),
    einheitId: text("einheit_id").notNull().references(() => einheit.id),
    wert: text("wert").$type<Stimmwert>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.topId, t.einheitId] })],
);

export const beschluss = pgTable(
  "beschluss",
  {
    id: text("id").primaryKey(),
    wegId: text("weg_id").notNull().references(() => weg.id),
    topId: text("top_id").references(() => top.id),
    nummer: integer("nummer").notNull(),
    wortlaut: text("wortlaut").notNull(),
    ort: text("ort").notNull(),
    datum: date("datum", { mode: "date" }).notNull(),
    angenommen: boolean("angenommen").notNull(),
    ergebnis: jsonb("ergebnis").$type<{ ja: number; nein: number; enthaltung: number; prinzip: Stimmrechtsprinzip }>(),
    eingetragenAm: timestamp("eingetragen_am", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.wegId, t.nummer)],
);
