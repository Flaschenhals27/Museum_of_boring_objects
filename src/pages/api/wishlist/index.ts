// =====================================================================
// pages/api/wishlist/index.ts — Wunschliste CRUD
// =====================================================================
// GET    /api/wishlist          -> eigene Wunschliste lesen
// POST   /api/wishlist          -> { itemId } hinzufügen
// DELETE /api/wishlist          -> { itemId } entfernen
//
// Funktioniert für eingeloggte Nutzer (per User-ID) UND für Gäste
// (per cart_session-Cookie). Beim Einloggen werden Gast-Einträge
// automatisch dem User zugeordnet (siehe api/auth/login.ts).
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';
import { db, Wishlist, Item, eq, and, inArray } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';
import { getOrCreateSessionId } from '../../../lib/cart';
import { jsonOk, jsonError } from '../../../lib/http';

// ---------------------------------------------------------------------
// Helper: Identität des aktuellen Besuchers ermitteln
// ---------------------------------------------------------------------
// Gibt entweder { userId } für eingeloggte oder { sessionId } für Gäste
// zurück. Bei Gästen wird notfalls eine neue Session-ID erzeugt
// (zentral in lib/cart.getOrCreateSessionId).
// ---------------------------------------------------------------------
async function getIdentity(cookies: AstroCookies): Promise<{ userId: number | null; sessionId: string | null }> {
  const userPayload = await getUserFromCookie(cookies);
  if (userPayload) {
    return { userId: userPayload.userId, sessionId: null };
  }
  return { userId: null, sessionId: getOrCreateSessionId(cookies) };
}

// Filterbedingung für DB-Queries: passt zur jeweiligen Identität
function identityWhere(identity: { userId: number | null; sessionId: string | null }) {
  return identity.userId !== null
    ? eq(Wishlist.userId, identity.userId)
    : eq(Wishlist.sessionId, identity.sessionId!);
}

// =====================================================================
// GET — eigene Wunschliste mit Item-Daten zurückgeben
// =====================================================================
export const GET: APIRoute = async ({ cookies }) => {
  const identity = await getIdentity(cookies);
  const entries = await db.select().from(Wishlist).where(identityWhere(identity));

  if (entries.length === 0) {
    return jsonOk({ items: [], count: 0 });
  }

  // Items in EINER Query dazuholen (kein N+1),
  // verwaiste Einträge selbstheilend entfernen
  const itemIds = [...new Set(entries.map((e) => e.itemId))];
  const products = await db.select().from(Item).where(inArray(Item.id, itemIds));
  const productById = new Map(products.map((p) => [p.id, p]));

  const items: Array<{ wishlistId: number; itemId: number; addedAt: Date; product: typeof Item.$inferSelect }> = [];
  const orphanedIds: number[] = [];
  for (const entry of entries) {
    const product = productById.get(entry.itemId);
    if (!product) {
      orphanedIds.push(entry.id);
      continue;
    }
    items.push({ wishlistId: entry.id, itemId: entry.itemId, addedAt: entry.addedAt, product });
  }
  if (orphanedIds.length > 0) {
    await db.delete(Wishlist).where(inArray(Wishlist.id, orphanedIds));
  }

  return jsonOk({ items, count: items.length });
};

// =====================================================================
// POST — Item zur Wunschliste hinzufügen
// =====================================================================
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungültiger Request.', 400);
  }

  const itemId = Number(body.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return jsonError('Ungültige itemId.', 400);
  }

  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  if (!product) {
    return jsonError('Artikel existiert nicht.', 404);
  }

  const identity = await getIdentity(cookies);

  // Doppelte Einträge vermeiden
  const existing = await db.select().from(Wishlist).where(
    and(identityWhere(identity), eq(Wishlist.itemId, itemId))
  );

  if (existing.length > 0) {
    return jsonOk({ success: true, alreadyExists: true });
  }

  await db.insert(Wishlist).values({
    userId:    identity.userId,
    sessionId: identity.sessionId,
    itemId,
    addedAt:   new Date(),
  });

  return jsonOk({ success: true, alreadyExists: false });
};

// =====================================================================
// DELETE — Item aus der Wunschliste entfernen
// =====================================================================
export const DELETE: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Ungültiger Request.', 400);
  }

  const itemId = Number(body.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return jsonError('Ungültige itemId.', 400);
  }

  const identity = await getIdentity(cookies);

  await db.delete(Wishlist).where(
    and(identityWhere(identity), eq(Wishlist.itemId, itemId))
  );

  return jsonOk({ success: true });
};
