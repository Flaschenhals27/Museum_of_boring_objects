// =====================================================================
// pages/api/newsletter/subscribe.ts — Newsletter-Anmeldung
// =====================================================================
// POST mit { email }
//
// Verschickt eine Bestätigungsmail an die angegebene Adresse über Resend.
// KEIN Persist in der DB — wir simulieren das Abo für den Demo-Charakter
// der Seite. Wer das später echt machen will, fügt eine NewsletterSubscriber-
// Tabelle hinzu und schickt Double-Opt-In-Link.
//
// Sicherheitsmaßnahmen:
//   - Rate-Limit pro IP (5 Versuche in 60 Minuten) — gegen Spam
//   - Strikte E-Mail-Validierung
//   - Mail-Fehler kippen die Anmeldung nicht — wir vermerken nur intern
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';

const RATE_MAX_ATTEMPTS = 5;
const RATE_WINDOW_MS    = 60 * 60 * 1000;  // 60 Minuten

export const POST: APIRoute = async ({ request }) => {
  // 1) Rate-Limit
  const ip = getClientIp(request);
  const limit = checkRateLimit(`newsletter:${ip}`, RATE_MAX_ATTEMPTS, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(JSON.stringify({
      error: `Zu viele Anmeldeversuche. Bitte ${Math.ceil(limit.retryAfterSec / 60)} Minuten warten.`,
    }), { status: 429 });
  }

  // 2) Body parsen + validieren
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiger Request.' }), { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return new Response(JSON.stringify({ error: 'E-Mail-Adresse fehlt.' }), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: 'E-Mail-Adresse hat kein gültiges Format.' }), { status: 400 });
  }

  // 3) Bestätigungsmail versenden
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to:   email,
      subject: 'Willkommen im Wochenblatt · Bestätigung Ihres Abonnements',
      html: buildEmail(email),
    });
  } catch (err) {
    console.error('[NEWSLETTER] Mail-Versand fehlgeschlagen:', err);
    return new Response(JSON.stringify({
      error: 'Bestätigungsmail konnte nicht versendet werden. Bitte später erneut versuchen.',
    }), { status: 502 });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Eine Bestätigung wurde Ihnen zugestellt — sofern unsere Setzerei dazu gekommen ist.',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// ---------------------------------------------------------------------
// E-Mail-Template
// ---------------------------------------------------------------------
function buildEmail(email: string): string {
  const year = new Date().getFullYear();
  return `
    <div style="font-family:'Lora',Georgia,serif; max-width:600px; margin:0 auto; padding:2rem; background:#f3ede1; color:#1a1612;">
      <div style="border-bottom:1px solid #1a1612; padding-bottom:1rem; text-align:center; margin-bottom:2rem;">
        <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:2rem; font-weight:800; margin:0;">The Ordinary Emporium</h1>
        <p style="font-style:italic; color:#4a423a; font-size:.9rem; margin:.5rem 0 0;">Das Wochenblatt für vollkommen belanglose Gegenstände.</p>
      </div>

      <p style="font-family:monospace; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#7a1f1f; margin:0 0 .5rem;">Abonnement</p>
      <h2 style="font-family:'Playfair Display',Georgia,serif; font-size:1.6rem; font-weight:800; margin:0 0 1rem;">
        Vermerkt. <em style="font-style:italic;">Mit Dank.</em>
      </h2>

      <p style="line-height:1.7; color:#4a423a; margin:0 0 1rem;">
        Ihre Adresse — <strong style="color:#1a1612;">${email}</strong> — wurde in die
        Bezugsliste unseres Wochenblatts aufgenommen. Sie erhalten künftig in
        überschaubarer Frequenz Nachricht über neue Einträge im Katalog,
        sofern es uns gelingt.
      </p>

      <div style="background:#ece4d3; border-left:3px solid #c8961d; padding:1rem 1.2rem; margin:1.5rem 0;">
        <p style="font-style:italic; margin:0; color:#4a423a; line-height:1.55;">
          Einmal pro Woche. Keine dringenden Nachrichten. Versprochen.
        </p>
      </div>

      <p style="font-family:monospace; font-size:.85rem; color:#7a6f5f; margin:1.5rem 0 0; line-height:1.6;">
        Sollten Sie ihre Meinung ändern, was wir mit Bedauern, aber auch mit
        Verständnis zur Kenntnis nehmen würden, finden Sie am Fuß jeder
        Ausgabe einen Abmeldelink.
      </p>

      <p style="font-family:monospace; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#7a6f5f; margin:2rem 0 0; text-align:center; border-top:1px solid #d3cab3; padding-top:1.5rem;">
        © ${year} The Ordinary Emporium · Aus Anstand erstellt.
      </p>
    </div>
  `;
}
