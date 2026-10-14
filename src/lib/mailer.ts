import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * E-Mail-Versand über SMTP. Eingerichtet wird er über SMTP_URL
 * (z. B. smtps://benutzer:passwort@mail.example.de:465) und SMTP_ABSENDER
 * (z. B. "smartWEG <einladung@smartweg.de>"). Ohne SMTP_URL läuft smartWEG im
 * Testmodus: Einladungen werden gespeichert und angezeigt, aber nicht verschickt.
 */
export const mailVersandEingerichtet = () => Boolean(process.env.SMTP_URL);

const g = globalThis as unknown as { smartwegMailer?: Transporter };

export interface Mail {
  an: string;
  antwortAn?: string;
  betreff: string;
  text: string;
}

/** Verschickt die Mail und gibt bei Erfolg null zurück, sonst die Fehlermeldung des Mailservers. */
export async function sendeMail(mail: Mail): Promise<string | null> {
  const url = process.env.SMTP_URL;
  if (!url) return "Kein Mailserver eingerichtet.";
  g.smartwegMailer ??= nodemailer.createTransport(url);
  try {
    await g.smartwegMailer.sendMail({
      from: process.env.SMTP_ABSENDER ?? "smartWEG <einladung@smartweg.de>",
      to: mail.an,
      replyTo: mail.antwortAn,
      subject: mail.betreff,
      text: mail.text,
    });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
