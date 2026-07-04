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
import { jsonOk, jsonError } from '../../../lib/http';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS    = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1) Rate-Limit
  const ip = getClientIp(request);
  const limit = checkRateLimit(`login:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!limit.allowed) {
    return jsonError(
      `Zu viele Anmeldeversuche. Bitte ${limit.retryAfterSec} Sekunden warten.`,
      429,
      { 'Retry-After': String(limit.retryAfterSec) },
    );
  }

  // 2) Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungültiger Request.', 400);
  }

  const email    = typeof body.email    === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return jsonError('E-Mail und Passwort sind erforderlich.', 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('E-Mail-Adresse hat kein gültiges Format.', 400);
  }

  // 3) User + Passwort prüfen (timing-safe gegen Account-Enumeration)
  const user = (await db.select().from(User).where(eq(User.email, email)))[0];
  const passwordHash = user?.password ?? '$2a$10$0000000000000000000000000000000000000000000000000000';
  const valid = await bcrypt.compare(password, passwordHash);

  if (!user || !valid) {
    return jsonError('E-Mail oder Passwort falsch.', 401);
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

    // 5c) Session-Rotation beim Privilegien-Wechsel (Gegenstück zum Logout):
    // Die alte Gast-sessionId darf nach dem Login keinen Zugriff mehr auf
    // den nun user-gebundenen Cart gewähren — falls sie vor dem Login
    // abgegriffen wurde. Cookie UND Cart-Datensatz bekommen eine frische ID.
    const rotatedSessionId = crypto.randomUUID();
    if (sessionCart) {
      await db.update(Cart).set({ sessionId: rotatedSessionId }).where(eq(Cart.id, sessionCart.id));
    }
    cookies.set('cart_session', rotatedSessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  return jsonOk({
    success: true,
    user: { id: user.id, email: user.email, username: user.username, prename: user.prename },
  });
};
