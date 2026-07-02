// =====================================================================
// pages/api/auth/reset-password.ts — Neues Passwort setzen
// =====================================================================
// POST mit { token, password }
//
// Ablauf:
//   1. Rate-Limit (erschwert Durchprobieren von Tokens — bei 32
//      Zufalls-Bytes ohnehin aussichtslos, aber Verteidigung in der Tiefe)
//   2. Token validieren + entwerten (Einmal-Verwendung, lib/passwordReset)
//   3. Neues Passwort mit bcrypt hashen und speichern
//
// Bewusste Grenze: Bereits ausgestellte Login-JWTs bleiben bis zu ihrem
// Ablauf (max. 7 Tage) gültig — JWTs sind zustandslos und ohne
// Token-Versionierung auf dem User nicht vorzeitig entwertbar.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.

import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import bcrypt from 'bcryptjs';
import { consumeResetToken } from '../../../lib/passwordReset';
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';
import { jsonOk, jsonError } from '../../../lib/http';

const RESET_MAX_ATTEMPTS = 10;
const RESET_WINDOW_MS    = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  // 1) Rate-Limit
  const ip = getClientIp(request);
  const limit = checkRateLimit(`reset:${ip}`, RESET_MAX_ATTEMPTS, RESET_WINDOW_MS);
  if (!limit.allowed) {
    return jsonError(
      `Zu viele Versuche. Bitte ${limit.retryAfterSec} Sekunden warten.`,
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

  const token    = typeof body.token    === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!token) {
    return jsonError('Reset-Token fehlt.', 400);
  }
  if (password.length < 8 || password.length > 128) {
    return jsonError('Passwort muss 8-128 Zeichen lang sein.', 400);
  }

  // 3) Token prüfen + entwerten (danach ist er weg — Einmal-Verwendung)
  const userId = await consumeResetToken(token);
  if (userId === null) {
    return jsonError(
      'Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.',
      400,
    );
  }

  // 4) Neues Passwort hashen + speichern (Cost-Faktor wie bei register)
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.update(User)
    .set({ password: hashedPassword })
    .where(eq(User.id, userId));

  return jsonOk({
    success: true,
    message: 'Ihr Passwort wurde geändert. Sie können sich nun anmelden.',
  });
};
