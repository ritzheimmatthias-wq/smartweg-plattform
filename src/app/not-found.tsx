import Link from "next/link";

export default function NichtGefunden() {
  return (
    <div className="seitenkopf">
      <p className="eyebrow">Nicht gefunden</p>
      <h1>Diese Seite gibt es nicht.</h1>
      <p>
        Zurück zur <Link href="/">Übersicht</Link>.
      </p>
    </div>
  );
}
