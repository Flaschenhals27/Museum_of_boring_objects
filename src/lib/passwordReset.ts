// =====================================================================
// lib/passwordReset.ts — Token-Logik für "Passwort vergessen"
// =====================================================================
// Ablauf:
//   1. createResetToken(userId)  -> erzeugt einen zufälligen Token,
//      speichert NUR dessen SHA-256-Hash in der DB und gibt den
//      Klartext zurück (der landet ausschließlich im E-Mail-Link).
//   2. consumeResetToken(raw)    -> hasht die Eingabe, sucht den
//      Datensatz, prüft den Ablauf und LÖSCHT ihn (Einmal-Verwendung).
//      Gibt die userId zurück oder null.
//
// Warum gehasht speichern? Wer die DB lesen kann (Backup, Injection),
// könnte sonst mit den Klartext-Tokens beliebige Konten übernehmen.
// Gleiche Idee wie beim Passwort-Hashing — nur reicht hier schnelles
// SHA-256 statt bcrypt, weil der Token 32 zufällige Bytes hat und
// damit nicht per Wörterbuch/Brute-Force erratbar ist.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import { db, PasswordResetToken, eq } from 'astro:db';

/** Gültigkeitsdauer eines Reset-Links. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 Minuten

/** 32 Zufalls-Bytes als Hex-String (64 Zeichen) — kryptografisch sicher. */
function generateRawToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256-Hash eines Tokens als Hex-String (Web Crypto, in Node 22 global). */
export async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Erzeugt einen neuen Reset-Token für den User und gibt den KLARTEXT
 * zurück (für den E-Mail-Link). Alte Tokens des Users werden gelöscht —
 * es gilt immer nur der jüngste Link.
 */
export async function createResetToken(userId: number): Promise<string> {
  const raw = generateRawToken();
  const tokenHash = await hashToken(raw);
  const now = new Date();

  await db.delete(PasswordResetToken).where(eq(PasswordResetToken.userId, userId));
  await db.insert(PasswordResetToken).values({
    userId,
    tokenHash,
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
    createdAt: now,
  });

  return raw;
}

/**
 * Validiert einen Token aus dem Reset-Link und entwertet ihn.
 * Gibt die userId zurück — oder null, wenn der Token unbekannt
 * oder abgelaufen ist. Abgelaufene Datensätze werden dabei gleich
 * aufgeräumt (selbstheilend, wie bei den Cart-Positionen).
 */
export async function consumeResetToken(raw: string): Promise<number | null> {
  if (!raw || raw.length !== 64) return null;

  const tokenHash = await hashToken(raw);
  const row = (await db.select().from(PasswordResetToken)
    .where(eq(PasswordResetToken.tokenHash, tokenHash)))[0];
  if (!row) return null;

  // In jedem Fall entwerten — gültig heißt hier: genau einmal benutzbar
  await db.delete(PasswordResetToken).where(eq(PasswordResetToken.id, row.id));

  if (new Date() > row.expiresAt) return null;
  return row.userId;
}
