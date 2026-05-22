// =====================================================================
// pages/api/auth/login.ts — Login eines bestehenden Nutzers
// =====================================================================
// POST mit { email, password }
//
// Sicherheitsmaßnahmen:
//   - Rate-Limiting pro IP (5 Versuche pro 15 Minuten)
//   - Konstantes Fehler-Profil (gleicher Text bei "unbekannter User" und
//     "falsches Passwort") -> erschwert Account-Enumeration
//   - bcrypt-Vergleich (timing-safe)
//
// Daten-Übernahme beim Login:
//   - Session-Warenkorb wird mit dem User verknüpft
//   - Gast-Wunschliste wird übernommen (Duplikate werden vermieden)
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, User, Cart, Wishlist, eq, and } from 'astro:db';
import bcrypt from 'bcryptjs';
import { createToken } from '../../../lib/auth';
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS    = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1) Rate-Limit
  const ip = getClientIp(request);
  const limit = checkRateLimit(`login:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!limit.allowed) {
    return new Response(JSON.stringify({
      error: `Zu viele Anmeldeversuche. Bitte ${limit.retryAfterSec} Sekunden warten.`,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(limit.retryAfterSec),
      },
    });
  }

  // 2) Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiger Request.' }), { status: 400 });
  }

  const email    = typeof body.email    === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'E-Mail und Passwort sind erforderlich.' }), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'E-Mail-Adresse hat kein gültiges Format.' }), { status: 400 });
  }

  // 3) User + Passwort prüfen (timing-safe gegen Account-Enumeration)
  const user = (await db.select().from(User).where(eq(User.email, email)))[0];
  const passwordHash = user?.password ?? '$2a$10$0000000000000000000000000000000000000000000000000000';
  const valid = await bcrypt.compare(password, passwordHash);

  if (!user || !valid) {
    return new Response(JSON.stringify({ error: 'E-Mail oder Passwort falsch.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4) Token + Cookie
  const token = await createToken(user.id, user.email);
  cookies.set('auth_token', token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
  });

  // 5) Session-Daten übernehmen (Cart + Wishlist)
  const sessionId = cookies.get('cart_session')?.value;
  if (sessionId) {
    // 5a) Cart: Session-Cart mit User verknüpfen, falls vorhanden
    const sessionCart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
    const userCart    = (await db.select().from(Cart).where(eq(Cart.userId, user.id)))[0];
    if (sessionCart && !userCart) {
      await db.update(Cart).set({ userId: user.id }).where(eq(Cart.id, sessionCart.id));
    }

    // 5b) Wishlist: Gast-Einträge dem User zuordnen, Duplikate vermeiden
    const guestEntries = await db.select().from(Wishlist).where(eq(Wishlist.sessionId, sessionId));
    for (const entry of guestEntries) {
      const userHasIt = await db.select().from(Wishlist).where(
        and(eq(Wishlist.userId, user.id), eq(Wishlist.itemId, entry.itemId))
      );
      if (userHasIt.length > 0) {
        await db.delete(Wishlist).where(eq(Wishlist.id, entry.id));
      } else {
        await db.update(Wishlist)
          .set({ userId: user.id, sessionId: null })
          .where(eq(Wishlist.id, entry.id));
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    user: { id: user.id, email: user.email, username: user.username, prename: user.prename },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
