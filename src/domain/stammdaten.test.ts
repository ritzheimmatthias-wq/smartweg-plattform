import { describe, expect, it } from "vitest";
import { meaHinweis, pruefeEinheit } from "./stammdaten";

describe("Stammdaten", () => {
  it("verlangt Bezeichnung und positive ganze MEA", () => {
    expect(pruefeEinheit({ bezeichnung: "EG links", mea: 168 })).toBeNull();
    expect(pruefeEinheit({ bezeichnung: " ", mea: 168 })).not.toBeNull();
    expect(pruefeEinheit({ bezeichnung: "EG links", mea: 0 })).not.toBeNull();
    expect(pruefeEinheit({ bezeichnung: "EG links", mea: 16.8 })).not.toBeNull();
  });

  it("weist auf ungewöhnliche MEA-Summen hin", () => {
    expect(meaHinweis(1000)).toBeNull();
    expect(meaHinweis(10000)).toBeNull();
    expect(meaHinweis(998)).toContain("998");
  });
});
