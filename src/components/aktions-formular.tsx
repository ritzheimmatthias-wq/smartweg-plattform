"use client";

import { startTransition, useActionState, useRef } from "react";
import type { Zustand } from "@/lib/zustand";

/**
 * Formular für eine Server-Aktion, das deren Fehler- oder Erfolgsmeldung über den Feldern anzeigt.
 * Nach einem Fehler bleiben die Eingaben stehen; geleert wird nur bei Erfolg.
 */
export function AktionsFormular({
  aktion,
  className,
  children,
}: {
  aktion: (zustand: Zustand, form: FormData) => Promise<Zustand>;
  className?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [zustand, formAction, laeuft] = useActionState(async (vorher: Zustand, form: FormData) => {
    const ergebnis = await aktion(vorher, form);
    if (!ergebnis.fehler) formRef.current?.reset();
    return ergebnis;
  }, {});

  // Über onSubmit statt action={…}, weil React ein Formular mit action nach jedem Absenden leert.
  function absenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(form));
  }

  return (
    <form ref={formRef} className={className} onSubmit={absenden} aria-busy={laeuft}>
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
