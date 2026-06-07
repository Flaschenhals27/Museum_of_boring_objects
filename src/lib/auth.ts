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
 * Liest das auth_token-Cookie und gibt das verifizierte Payload zurück.
 * Gibt null zurück, wenn kein Cookie da oder Token ungültig.
 */
export async function getUserFromCookie(cookies: AstroCookies) {
  const token = cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
