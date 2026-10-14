import { describe, expect, it } from "vitest";
import { Abstimmungsfehler, type Einheit, zaehleStimmen } from "./abstimmung";

// Lindenstraße 12: sechs Einheiten, 1.000 MEA. Familie Weber besitzt zwei Einheiten.
const haus: Einheit[] = [
  { id: "eg-li", bezeichnung: "EG li", mea: 168, eigentuemer: ["keller"] },
  { id: "eg-re", bezeichnung: "EG re", mea: 152, eigentuemer: ["yilmaz"] },
  { id: "1-li", bezeichnung: "1. OG li", mea: 171, eigentuemer: ["weber-j", "weber-a"] },
  { id: "1-re", bezeichnung: "1. OG re", mea: 158, eigentuemer: ["weber-a", "weber-j"] },
  { id: "2-li", bezeichnung: "2. OG li", mea: 186, eigentuemer: ["brandt"] },
  { id: "2-re", bezeichnung: "2. OG re", mea: 165, eigentuemer: ["novak"] },
];

describe("zaehleStimmen", () => {
  it("zählt im Wertprinzip nach MEA, Enthaltungen zählen nicht", () => {
    const r = zaehleStimmen(
      haus,
      [
        { einheitId: "eg-li", wert: "ja" },
        { einheitId: "eg-re", wert: "nein" },
        { einheitId: "1-li", wert: "ja" },
        { einheitId: "1-re", wert: "ja" },
        { einheitId: "2-li", wert: "ja" },
        { einheitId: "2-re", wert: "enthaltung" },
      ],
      "mea",
    );
    expect(r).toMatchObject({ ja: 683, nein: 152, enthaltung: 165, gesamt: 1000, angenommen: true });
  });

  it("gibt im Kopfprinzip einem Eigentümer mit zwei Einheiten nur eine Stimme", () => {
    const r = zaehleStimmen(
      haus,
      [
        { einheitId: "1-li", wert: "ja" },
        { einheitId: "1-re", wert: "ja" },
        { einheitId: "eg-li", wert: "nein" },
      ],
      "kopf",
    );
    expect(r).toMatchObject({ ja: 1, nein: 1, gesamt: 5, angenommen: false });
  });

  it("zählt im Objektprinzip eine Stimme je Einheit", () => {
    const r = zaehleStimmen(
      haus,
      [
        { einheitId: "1-li", wert: "ja" },
        { einheitId: "1-re", wert: "ja" },
        { einheitId: "eg-li", wert: "nein" },
      ],
      "objekt",
    );
    expect(r).toMatchObject({ ja: 2, nein: 1, gesamt: 6, angenommen: true });
  });

  it("lehnt bei Stimmengleichheit ab", () => {
    const r = zaehleStimmen(
      haus,
      [
        { einheitId: "eg-li", wert: "ja" },
        { einheitId: "eg-re", wert: "nein" },
      ],
      "objekt",
    );
    expect(r.angenommen).toBe(false);
  });

  it("verlangt für die qualifizierte Mehrheit zwei Drittel und mehr als die Hälfte aller MEA", () => {
    const abgaben = [
      { einheitId: "eg-li", wert: "ja" as const },
      { einheitId: "eg-re", wert: "ja" as const },
      { einheitId: "2-re", wert: "nein" as const },
    ];
    // 2 von 3 Stimmen sind genau zwei Drittel, nicht mehr: abgelehnt.
    expect(zaehleStimmen(haus, abgaben, "objekt", "zweiDrittelUndHalbeMea").angenommen).toBe(false);

    const mehr = [...abgaben.slice(0, 2), { einheitId: "2-li", wert: "ja" as const }, abgaben[2]];
    // 3 von 4 Stimmen, aber nur 506 von 1.000 MEA: angenommen.
    const r = zaehleStimmen(haus, mehr, "objekt", "zweiDrittelUndHalbeMea");
    expect(r.jaMea).toBe(506);
    expect(r.angenommen).toBe(true);
  });

  it("weist doppelte und widersprüchliche Stimmen zurück", () => {
    expect(() =>
      zaehleStimmen(haus, [{ einheitId: "eg-li", wert: "ja" }, { einheitId: "eg-li", wert: "nein" }], "mea"),
    ).toThrow(Abstimmungsfehler);
    expect(() =>
      zaehleStimmen(haus, [{ einheitId: "1-li", wert: "ja" }, { einheitId: "1-re", wert: "nein" }], "kopf"),
    ).toThrow(Abstimmungsfehler);
  });
});
