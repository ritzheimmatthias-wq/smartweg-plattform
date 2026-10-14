import { describe, expect, it } from "vitest";
import { hashePasswort, hashToken, neuesSitzungstoken, normalisiereEmail, pruefeEmail, pruefePasswort, pruefePasswortHash } from "./konto";

describe("Konto", () => {
  it("prüft Passwort gegen den gespeicherten Hash", async () => {
    const hash = await hashePasswort("lindenstrasse12");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await pruefePasswortHash("lindenstrasse12", hash)).toBe(true);
    expect(await pruefePasswortHash("lindenstrasse13", hash)).toBe(false);
    expect(await pruefePasswortHash("lindenstrasse12", "kaputt")).toBe(false);
  });

  it("erzeugt für dasselbe Passwort unterschiedliche Hashes", async () => {
    expect(await hashePasswort("lindenstrasse12")).not.toBe(await hashePasswort("lindenstrasse12"));
  });

  it("normalisiert und prüft E-Mail-Adressen", () => {
    expect(normalisiereEmail("  U.Keller@Example.ORG ")).toBe("u.keller@example.org");
    expect(pruefeEmail("u.keller@example.org")).toBeNull();
    expect(pruefeEmail("u.keller")).not.toBeNull();
  });

  it("verlangt mindestens zehn Zeichen im Passwort", () => {
    expect(pruefePasswort("kurz")).not.toBeNull();
    expect(pruefePasswort("lang-genug-1")).toBeNull();
  });

  it("speichert nur den Hash des Sitzungstokens", () => {
    const { token, hash } = neuesSitzungstoken();
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
  });
});
