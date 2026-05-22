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
import { db, Wishlist, Item, eq, and, or, sql } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

// ---------------------------------------------------------------------
// Helper: Identität des aktuellen Besuchers ermitteln
// ---------------------------------------------------------------------
// Gibt entweder { userId } für eingeloggte oder { sessionId } für Gäste
// zurück. Bei Gästen wird notfalls eine neue Session-ID erzeugt.
// ---------------------------------------------------------------------
async function getIdentity(cookies: any): Promise<{ userId: number | null; sessionId: string | null }> {
  const userPayload = await getUserFromCookie(cookies);
  if (userPayload) {
    return { userId: userPayload.userId, sessionId: null };
  }

  let sessionId = cookies.get('cart_session')?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookies.set('cart_session', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  return { userId: null, sessionId };
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

  // Items dazuholen, verwaiste Einträge selbstheilend entfernen
  const enriched = await Promise.all(
    entries.map(async (entry) => {
      const product = (await db.select().from(Item).where(eq(Item.id, entry.itemId)))[0];
      if (!product) {
        await db.delete(Wishlist).where(eq(Wishlist.id, entry.id));
        return null;
      }
      return {
        wishlistId: entry.id,
        itemId: entry.itemId,
        addedAt: entry.addedAt,
        product,
      };
    })
  );

  const items = enriched.filter((x): x is NonNullable<typeof x> => x !== null);

  return new Response(JSON.stringify({ items, count: items.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================================
// POST — Item zur Wunschliste hinzufügen
// =====================================================================
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiger Request.' }), { status: 400 });
  }

  const itemId = Number(body.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return new Response(JSON.stringify({ error: 'Ungültige itemId.' }), { status: 400 });
  }

  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  if (!product) {
    return new Response(JSON.stringify({ error: 'Artikel existiert nicht.' }), { status: 404 });
  }

  const identity = await getIdentity(cookies);

  // Doppelte Einträge vermeiden
  const existing = await db.select().from(Wishlist).where(
    and(identityWhere(identity), eq(Wishlist.itemId, itemId))
  );

  if (existing.length > 0) {
    return new Response(JSON.stringify({ success: true, alreadyExists: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.insert(Wishlist).values({
    userId:    identity.userId,
    sessionId: identity.sessionId,
    itemId,
    addedAt:   new Date(),
  });

  return new Response(JSON.stringify({ success: true, alreadyExists: false }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================================
// DELETE — Item aus der Wunschliste entfernen
// =====================================================================
export const DELETE: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültiger Request.' }), { status: 400 });
  }

  const itemId = Number(body.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return new Response(JSON.stringify({ error: 'Ungültige itemId.' }), { status: 400 });
  }

  const identity = await getIdentity(cookies);

  await db.delete(Wishlist).where(
    and(identityWhere(identity), eq(Wishlist.itemId, itemId))
  );

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
