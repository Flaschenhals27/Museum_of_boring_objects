// =====================================================================
// pages/api/auth/register.ts — Neuen Nutzer anlegen
// =====================================================================
// POST mit { email, username, password, prename, surname }
//
// Sicherheitsmaßnahmen:
//   - Rate-Limiting pro IP (3 Versuche pro 60 Minuten, gegen Massen-Spam)
//   - Eingabevalidierung (E-Mail-Format, Mindestlängen, erlaubte Zeichen)
//   - bcrypt-Hashing mit Cost-Faktor 10
//   - Kein Verraten welche der beiden Felder (Email/Username) belegt war
//     -> Eine generische Fehlermeldung, um Account-Enumeration zu erschweren
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, User, eq, or } from 'astro:db';
import bcrypt from 'bcryptjs';
import { createToken } from '../../../lib/auth';
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';

const REG_MAX_ATTEMPTS = 3;
const REG_WINDOW_MS    = 60 * 60 * 1000;  // 60 Minuten

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1) Rate-Limit
  const ip = getClientIp(request);
  const limit = checkRateLimit(`register:${ip}`, REG_MAX_ATTEMPTS, REG_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(JSON.stringify({
      error: `Zu viele Registrierungsversuche. Bitte ${Math.ceil(limit.retryAfterSec / 60)} Minuten warten.`,
    }), {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfterSec) },
    });
  }

  // 2) Body parsen
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiger Request.' }), { status: 400 });
  }

  const email    = typeof body.email    === 'string' ? body.email.trim().toLowerCase() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const prename  = typeof body.prename  === 'string' ? body.prename.trim() : '';
  const surname  = typeof body.surname  === 'string' ? body.surname.trim() : '';

  // 3) Validierung
  if (!email || !username || !password || !prename || !surname) {
    return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich.' }), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'E-Mail-Adresse hat kein gültiges Format.' }), { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return new Response(JSON.stringify({ error: 'Benutzername: 3-32 Zeichen, nur Buchstaben, Zahlen, _ und -.' }), { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return new Response(JSON.stringify({ error: 'Passwort muss 8-128 Zeichen lang sein.' }), { status: 400 });
  }
  if (prename.length > 64 || surname.length > 64) {
    return new Response(JSON.stringify({ error: 'Vor- bzw. Nachname zu lang.' }), { status: 400 });
  }

  // 4) Existenz-Check (entweder Email oder Username)
  const existing = await db.select().from(User).where(
    or(eq(User.email, email), eq(User.username, username))
  );
  if (existing.length > 0) {
    return new Response(JSON.stringify({
      error: 'Diese E-Mail oder dieser Benutzername ist bereits registriert.',
    }), { status: 409 });
  }

  // 5) Passwort hashen + User anlegen
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.insert(User).values({
    email,
    username,
    password: hashedPassword,
    prename,
    surname,
    createdAt: new Date(),
  });

  // 6) Frisch angelegten User holen für Token
  const newUser = (await db.select().from(User).where(eq(User.email, email)))[0];
  const token = await createToken(newUser.id, newUser.email);
  cookies.set('auth_token', token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
  });

  return new Response(JSON.stringify({
    success: true,
    user: { id: newUser.id, email: newUser.email, username: newUser.username, prename: newUser.prename },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
