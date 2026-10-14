/** Rückgabe einer Formular-Aktion: leer bei Erfolg (meist folgt eine Weiterleitung), sonst die Fehlermeldung. */
export interface Zustand {
  fehler?: string;
  hinweis?: string;
}

export const fehler = (text: string): Zustand => ({ fehler: text });

export function text(form: FormData, feld: string): string {
  return String(form.get(feld) ?? "").trim();
}
