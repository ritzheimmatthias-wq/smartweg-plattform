export const migrationSql = `
CREATE TABLE IF NOT EXISTS weg (
  id text PRIMARY KEY,
  name text NOT NULL,
  adresse text NOT NULL,
  stimmrechtsprinzip text NOT NULL DEFAULT 'kopf' CHECK (stimmrechtsprinzip IN ('kopf','objekt','mea'))
);
CREATE TABLE IF NOT EXISTS konto (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  passwort_hash text NOT NULL,
  erstellt_am timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sitzung (
  token_hash text PRIMARY KEY,
  konto_id text NOT NULL REFERENCES konto(id) ON DELETE CASCADE,
  laeuft_ab timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS mitglied (
  weg_id text NOT NULL REFERENCES weg(id) ON DELETE CASCADE,
  konto_id text NOT NULL REFERENCES konto(id) ON DELETE CASCADE,
  rolle text NOT NULL CHECK (rolle IN ('verwalter','eigentuemer')),
  PRIMARY KEY (weg_id, konto_id)
);
CREATE TABLE IF NOT EXISTS person (
  id text PRIMARY KEY,
  weg_id text NOT NULL REFERENCES weg(id),
  konto_id text REFERENCES konto(id),
  name text NOT NULL,
  email text
);
CREATE INDEX IF NOT EXISTS person_email ON person (lower(email));
CREATE TABLE IF NOT EXISTS einheit (
  id text PRIMARY KEY,
  weg_id text NOT NULL REFERENCES weg(id),
  bezeichnung text NOT NULL,
  mea integer NOT NULL CHECK (mea > 0),
  sortierung integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS eigentum (
  einheit_id text NOT NULL REFERENCES einheit(id),
  person_id text NOT NULL REFERENCES person(id),
  PRIMARY KEY (einheit_id, person_id)
);
CREATE TABLE IF NOT EXISTS versammlung (
  id text PRIMARY KEY,
  weg_id text NOT NULL REFERENCES weg(id),
  titel text NOT NULL,
  datum date NOT NULL,
  uhrzeit text NOT NULL,
  ort text NOT NULL,
  online_teilnahme boolean NOT NULL DEFAULT false,
  versandweg text NOT NULL DEFAULT 'email' CHECK (versandweg IN ('email','post')),
  einladung_versandt_am date
);
CREATE TABLE IF NOT EXISTS top (
  id text PRIMARY KEY,
  versammlung_id text NOT NULL REFERENCES versammlung(id),
  nummer integer NOT NULL,
  titel text NOT NULL,
  beschlussantrag text NOT NULL,
  mehrheit text NOT NULL DEFAULT 'einfach' CHECK (mehrheit IN ('einfach','zweiDrittelUndHalbeMea')),
  verkuendet_am timestamp
);
CREATE TABLE IF NOT EXISTS stimme (
  top_id text NOT NULL REFERENCES top(id),
  einheit_id text NOT NULL REFERENCES einheit(id),
  wert text NOT NULL CHECK (wert IN ('ja','nein','enthaltung')),
  PRIMARY KEY (top_id, einheit_id)
);
CREATE TABLE IF NOT EXISTS beschluss (
  id text PRIMARY KEY,
  weg_id text NOT NULL REFERENCES weg(id),
  top_id text REFERENCES top(id),
  nummer integer NOT NULL,
  wortlaut text NOT NULL,
  ort text NOT NULL,
  datum date NOT NULL,
  angenommen boolean NOT NULL,
  ergebnis jsonb,
  eingetragen_am timestamp NOT NULL DEFAULT now(),
  UNIQUE (weg_id, nummer)
);
`;
