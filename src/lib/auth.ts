// =====================================================================
// lib/auth.ts — JWT-basierte Authentifizierung
// =====================================================================
// Nutzt die `jose`-Library für signierte JWTs.
// Token werden über das Cookie 'auth_token' transportiert.
//
// Sicherheit: Das JWT_SECRET MUSS in der .env gesetzt sein.
// Sonst werfen wir beim Startup eine Exception, statt mit einem
// vorhersehbaren Default-Secret zu arbeiten (das wäre angreifbar).
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.
// =====================================================================

import { SignJWT, jwtVerify } from 'jose';
import type { AstroCookies } from 'astro';
import { db, User, eq } from 'astro:db';

const rawSecret = import.meta.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    'JWT_SECRET fehlt oder ist zu kurz in .env. ' +
    'Bitte einen zufälligen String mit mindestens 32 Zeichen setzen.'
  );
}
const JWT_SECRET = new TextEncoder().encode(rawSecret);

/**
 * Erstellt ein signiertes JWT mit 7 Tagen Gültigkeit.
 */
export async function createToken(userId: number, email: string) {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Prüft die Signatur und Ablaufzeit eines JWT.
 * Gibt das Payload zurück oder null bei ungültigem Token.
 */
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; email: string };
  } catch {
    return null;
  }
}

/**
 * Liest das auth_token-Cookie und gibt das verifizierte Payload zurück —
 * aber NUR, wenn der Nutzer auch wirklich (noch) in der DB existiert.
 * Gibt sonst null zurück (kein Cookie, ungültiges Token, ODER gelöschter/
 * unbekannter Nutzer).
 *
 * Warum die DB-Prüfung? Ein Token kann gültig signiert sein und trotzdem
 * auf einen Nutzer zeigen, den es nicht (mehr) gibt — z.B. nach dem
 * Löschen eines Kontos oder wenn ein altes Token aus einer anderen
 * Datenbank stammt. Ohne diese Prüfung würden Inserts mit dieser userId
 * (Cart, Order, Wishlist) an der Foreign-Key-Beziehung zu User scheitern.
 */
export async function getUserFromCookie(cookies: AstroCookies) {
  const token = cookies.get('auth_token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const stillExists = (
    await db.select({ id: User.id }).from(User).where(eq(User.id, payload.userId))
  )[0];
  if (!stillExists) return null;

  return payload;
}
