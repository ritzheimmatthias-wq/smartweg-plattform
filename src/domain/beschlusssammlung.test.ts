import { describe, expect, it } from "vitest";
import { naechsteNummer, pruefeWortlaut } from "./beschlusssammlung";

describe("Beschlusssammlung", () => {
  it("nummeriert fortlaufend, auch mit Lücken", () => {
    expect(naechsteNummer([])).toBe(1);
    expect(naechsteNummer([{ nummer: 1 }, { nummer: 4 }, { nummer: 2 }])).toBe(5);
  });

  it("verlangt einen vollständigen Wortlaut", () => {
    expect(pruefeWortlaut("Ja")).not.toBeNull();
    expect(pruefeWortlaut("Die Dachrinne wird für bis zu 4.800 € erneuert.")).toBeNull();
  });
});
