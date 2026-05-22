// =====================================================================
// pages/api/cart/add.ts — Artikel in den Warenkorb legen
// =====================================================================
// POST mit { itemId, quantity? }
// Findet/erstellt den Cart des aktuellen Nutzers (per Cookie oder User),
// fügt das Item hinzu bzw. erhöht die Menge.
//
// Hinweis: Stock wird hier NICHT reduziert — das passiert erst beim
// erfolgreichen Bestellabschluss in POST /api/orders.
// (Vermeidet, dass aufgegebene Warenkörbe Lager blockieren.)
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, Cart, CartItem, Item, eq, and } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1) Body parsen + minimal validieren
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body ist kein gültiges JSON.' }), { status: 400 });
  }

  const itemId   = Number(body.itemId);
  const quantity = Number(body.quantity ?? 1);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return new Response(JSON.stringify({ error: 'Ungültige itemId.' }), { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
    return new Response(JSON.stringify({ error: 'Ungültige Menge.' }), { status: 400 });
  }

  // 2) Existiert das Item überhaupt?
  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  if (!product) {
    return new Response(JSON.stringify({ error: 'Artikel existiert nicht.' }), { status: 404 });
  }

  // 3) User-Identität ermitteln
  const userPayload = await getUserFromCookie(cookies);

  let sessionId = cookies.get('cart_session')?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookies.set('cart_session', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
    });
  }

  // 4) Cart finden — zuerst per User, dann per Session
  let cart;
  if (userPayload) {
    cart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  if (!cart) {
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  // 5) Cart erstellen falls nicht vorhanden
  if (!cart) {
    await db.insert(Cart).values({
      sessionId,
      userId: userPayload?.userId ?? null,
      createdAt: new Date(),
    });
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  // 6) Falls User eingeloggt und Cart noch keine userId hat → verknüpfen
  if (userPayload && !cart.userId) {
    await db.update(Cart).set({ userId: userPayload.userId }).where(eq(Cart.id, cart.id));
  }

  // 7) Item-Position im Cart hinzufügen oder Menge erhöhen
  const existingItem = (await db.select().from(CartItem).where(
    and(eq(CartItem.cartId, cart.id), eq(CartItem.itemId, itemId))
  ))[0];

  // 8) Mengen-Check gegen den realen Lagerbestand
  const desiredTotal = (existingItem?.quantity ?? 0) + quantity;
  if (desiredTotal > product.stock) {
    return new Response(JSON.stringify({
      error: `Nicht ausreichend verfügbar (Lager: ${product.stock}).`,
    }), { status: 409 });
  }

  if (existingItem) {
    await db.update(CartItem)
      .set({ quantity: desiredTotal })
      .where(eq(CartItem.id, existingItem.id));
  } else {
    await db.insert(CartItem).values({ cartId: cart.id, itemId, quantity });
  }

  // Stock-Reduzierung passiert erst bei Bestellabschluss (siehe pages/api/orders/index.ts)

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
