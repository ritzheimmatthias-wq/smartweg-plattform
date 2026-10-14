const datumFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const langFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const formatDatum = (d: Date) => datumFormat.format(d);
export const formatDatumLang = (d: Date) => langFormat.format(d);
export const formatZahl = (n: number) => n.toLocaleString("de-DE");
export const isoDatum = (d: Date) => d.toISOString().slice(0, 10);

export const PRINZIP_TEXT = {
  kopf: "Kopfprinzip: eine Stimme je Eigentümer",
  objekt: "Objektprinzip: eine Stimme je Einheit",
  mea: "Wertprinzip: nach Miteigentumsanteilen (MEA)",
} as const;

export const EINHEIT_TEXT = { kopf: "Stimmen", objekt: "Stimmen", mea: "MEA" } as const;
