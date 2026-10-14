"use client";

import { useActionState } from "react";
import type { Zustand } from "@/lib/aktionen";

/** Formular für eine Server-Aktion, das deren Fehlermeldung über den Feldern anzeigt. */
export function AktionsFormular({
  aktion,
  className,
  children,
}: {
  aktion: (zustand: Zustand, form: FormData) => Promise<Zustand>;
  className?: string;
  children: React.ReactNode;
}) {
  const [zustand, formAction, laeuft] = useActionState(aktion, {});
  return (
    <form className={className} action={formAction} aria-busy={laeuft}>
      {zustand.fehler && (
        <p className="hinweis" role="alert">
          {zustand.fehler}
        </p>
      )}
      {children}
    </form>
  );
}
