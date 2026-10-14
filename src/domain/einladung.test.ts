import { describe, expect, it } from "vitest";
import { einladungstext, empfaenger, fristnachweis } from "./einladung";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("empfaenger", () => {
  it("lädt Eigentümer mehrerer Einheiten nur einmal ein", () => {
    const liste = empfaenger([
      { bezeichnung: "EG", personen: [{ id: "a", name: "Anna Weber", email: "a@x.de" }] },
      { bezeichnung: "OG", personen: [{ id: "a", name: "Anna Weber", email: "a@x.de" }, { id: "b", name: "Bert Brief", email: " " }] },
    ]);
    expect(liste).toEqual([
      { personId: "a", name: "Anna Weber", email: "a@x.de", einheiten: ["EG", "OG"] },
      { personId: "b", name: "Bert Brief", email: null, einheiten: ["OG"] },
    ]);
  });
});

describe("einladungstext", () => {
  it("enthält Termin, Ort, Tagesordnung mit Beschlussantrag und Bestätigungslink", () => {
    const { betreff, text } = einladungstext(
      {
        wegName: "WEG Lindenstraße 12",
        wegAdresse: "Lindenstraße 12, Berlin",
        titel: "Ordentliche Eigentümerversammlung 2026",
        datum: d("2026-11-26"),
        uhrzeit: "18:30",
        ort: "Gemeinschaftsraum",
        onlineTeilnahme: true,
        tops: [{ nummer: 1, titel: "Dachrinne", beschlussantrag: "Die Dachrinne wird erneuert." }],
        absender: "Petra Brandt",
      },
      { personId: "a", name: "Anna Weber", email: "a@x.de", einheiten: ["EG", "OG"] },
      "https://smartweg.de/einladung/abc",
    );
    expect(betreff).toBe("Einladung: Ordentliche Eigentümerversammlung 2026 am Donnerstag, 26. November 2026");
    expect(text).toContain("Ihre Einheiten: EG, OG");
    expect(text).toContain("18:30 Uhr");
    expect(text).toContain("TOP 1: Dachrinne\nBeschlussantrag: Die Dachrinne wird erneuert.");
    expect(text).toContain("online");
    expect(text).toContain("https://smartweg.de/einladung/abc");
  });
});

describe("fristnachweis", () => {
  const versammlung = d("2026-11-26");

  it("ist eingehalten, wenn jeder Eigentümer rechtzeitig eingeladen ist", () => {
    const n = fristnachweis(
      versammlung,
      [
        { personId: "a", versandweg: "email", versandtAm: d("2026-11-05") },
        { personId: "b", versandweg: "post", versandtAm: d("2026-11-02") },
      ],
      2,
    );
    expect(n).toMatchObject({ eingehalten: true, offen: 0, unterschritten: 0, kuerzesterVorlauf: 21 });
    expect(n.letzterZugang).toEqual(d("2026-11-05"));
  });

  it("zählt einen zu spät verschickten Brief als Unterschreitung", () => {
    const n = fristnachweis(
      versammlung,
      [
        { personId: "a", versandweg: "email", versandtAm: d("2026-11-01") },
        { personId: "b", versandweg: "post", versandtAm: d("2026-11-05") },
      ],
      2,
    );
    expect(n).toMatchObject({ eingehalten: false, unterschritten: 1, kuerzesterVorlauf: 18 });
  });

  it("ist nicht eingehalten, solange ein Eigentümer noch nicht eingeladen ist", () => {
    const n = fristnachweis(
      versammlung,
      [
        { personId: "a", versandweg: "email", versandtAm: d("2026-10-14") },
        { personId: "b", versandweg: "post", versandtAm: null },
      ],
      3,
    );
    expect(n).toMatchObject({ eingehalten: false, offen: 2, unterschritten: 0 });
  });
});
