"use client";

import { useActionState } from "react";
import type { Zustand } from "@/lib/zustand";

/** Formular für eine Server-Aktion, das deren Fehler- oder Erfolgsmeldung über den Feldern anzeigt. */
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
      {zustand.hinweis && (
        <p className="hinweis ok" role="status">
          {zustand.hinweis}
        </p>
      )}
      {children}
    </form>
  );
}
