// =====================================================================
// pages/api/auth/forgot-password.ts — Passwort-Reset anfordern
// =====================================================================
// POST mit { email }
//
// Sicherheitsmaßnahmen:
//   - Rate-Limiting pro IP (3 Versuche pro 60 Minuten)
//   - ANTI-ENUMERATION: Die Antwort ist IMMER dieselbe, egal ob die
//     E-Mail zu einem Konto gehört oder nicht. Sonst könnte jeder
//     durchprobieren, welche Adressen registriert sind (dasselbe
//     Prinzip wie die generische Fehlermeldung beim Login).
//   - Der Reset-Token wird nur gehasht gespeichert (lib/passwordReset).
//
// Demo-Fallback: Der Resend-Test-Absender (onboarding@resend.dev) darf
// nur an die eigene Konto-Adresse senden. Im DEV-Modus wird der
// Reset-Link daher zusätzlich in der SERVER-Konsole geloggt — so ist
// der Flow auch ohne verifizierte Mail-Domain vorführbar.
// WICHTIG: Der Link wird NUR im Dev-Modus geloggt. In Produktion wäre
// jeder geloggte Link ein Konto-Übernahme-Risiko für alle, die Logs
// lesen können — dort wird bei Mail-Fehlern nur der Fehler vermerkt.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.

import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { Resend } from 'resend';
import { createResetToken, RESET_TOKEN_TTL_MS } from '../../../lib/passwordReset';
import { renderPasswordResetEmail } from '../../../lib/email';
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';
import { jsonOk, jsonError } from '../../../lib/http';

const FORGOT_MAX_ATTEMPTS = 3;
const FORGOT_WINDOW_MS    = 60 * 60 * 1000;  // 60 Minuten

// Die eine, immer gleiche Antwort (Anti-Enumeration)
const NEUTRAL_MESSAGE =
  'Falls ein Konto mit dieser Adresse existiert, wurde ein Reset-Link versendet.';

export const POST: APIRoute = async ({ request }) => {
  // 1) Rate-Limit
  const ip = getClientIp(request);
  const limit = checkRateLimit(`forgot:${ip}`, FORGOT_MAX_ATTEMPTS, FORGOT_WINDOW_MS);
  if (!limit.allowed) {
    return jsonError(
      `Zu viele Anfragen. Bitte ${Math.ceil(limit.retryAfterSec / 60)} Minuten warten.`,
      429,
      { 'Retry-After': String(limit.retryAfterSec) },
    );
  }

  // 2) Body parsen + validieren
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungültiger Request.', 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('E-Mail-Adresse hat kein gültiges Format.', 400);
  }

  // 3) User suchen — Ergebnis beeinflusst NICHT die Antwort
  const user = (await db.select().from(User).where(eq(User.email, email)))[0];

  if (user) {
    // 4) Token erzeugen (Klartext nur hier + im Link, DB hält den Hash)
    const rawToken = await createResetToken(user.id);
    const resetUrl = new URL(
      `/reset-password?token=${rawToken}`,
      new URL(request.url).origin,
    ).toString();
    const ttlMinutes = Math.round(RESET_TOKEN_TTL_MS / 60_000);

    // 5) Mail versenden — Fehler kippen die neutrale Antwort nicht
    try {
      const resend = new Resend(import.meta.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to:   email,
        subject: 'Kennwort-Angelegenheit · Zurücksetzen Ihres Passworts',
        html:    renderPasswordResetEmail(resetUrl, ttlMinutes),
      });
    } catch (err) {
      // Nur den Fehler loggen — NIE den Link (siehe Kopf-Kommentar)
      console.error('[FORGOT-PASSWORD] Mail-Versand fehlgeschlagen:', err);
    }

    // Nur im Dev-Modus den Link loggen (Abnahme-Demo ohne Mail-Domain)
    if (import.meta.env.DEV) {
      console.log(`[FORGOT-PASSWORD] Dev-Link für ${email}: ${resetUrl}`);
    }
  }

  // 6) Immer dieselbe Antwort — auch wenn kein Konto existiert
  return jsonOk({ success: true, message: NEUTRAL_MESSAGE });
};
