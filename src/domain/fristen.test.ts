import { describe, expect, it } from "vitest";
import { pruefeEinladungsfrist, spaetesterVersand } from "./fristen";

const versammlung = new Date("2026-11-26");

describe("Einladungsfrist", () => {
  it("berechnet den spätesten Versand für E-Mail und Post", () => {
    expect(spaetesterVersand(versammlung, "email").toISOString().slice(0, 10)).toBe("2026-11-05");
    expect(spaetesterVersand(versammlung, "post").toISOString().slice(0, 10)).toBe("2026-11-02");
  });

  it("hält die Frist bei genau drei Wochen ein", () => {
    expect(pruefeEinladungsfrist(versammlung, new Date("2026-11-05"), "email")).toMatchObject({
      eingehalten: true,
      tageVorlauf: 21,
    });
  });

  it("rechnet die Postlaufzeit ein", () => {
    const r = pruefeEinladungsfrist(versammlung, new Date("2026-11-05"), "post");
    expect(r).toMatchObject({ eingehalten: false, tageVorlauf: 18 });
  });
});
