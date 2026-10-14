import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const MIN_PASSWORT_LAENGE = 10;

export function normalisiereEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function pruefeEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisiereEmail(email)) ? null : "Bitte geben Sie eine gültige E-Mail-Adresse an.";
}

export function pruefePasswort(passwort: string): string | null {
  if (passwort.length < MIN_PASSWORT_LAENGE) {
    return `Das Passwort braucht mindestens ${MIN_PASSWORT_LAENGE} Zeichen.`;
  }
  return null;
}

/** Speicherformat: scrypt$<salt base64url>$<hash base64url> */
export async function hashePasswort(passwort: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(passwort, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function pruefePasswortHash(passwort: string, gespeichert: string): Promise<boolean> {
  const [verfahren, salt, hash] = gespeichert.split("$");
  if (verfahren !== "scrypt" || !salt || !hash) return false;
  const erwartet = Buffer.from(hash, "base64url");
  const berechnet = await scrypt(passwort, Buffer.from(salt, "base64url"), erwartet.length);
  return timingSafeEqual(erwartet, berechnet);
}

/** Zufälliges Sitzungstoken für das Cookie; in der Datenbank liegt nur sein Hash. */
export function neuesSitzungstoken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
