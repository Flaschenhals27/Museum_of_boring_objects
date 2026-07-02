// =====================================================================
// pages/api/cart/add.ts — Artikel in den Warenkorb legen
// =====================================================================
// POST mit { itemId, quantity? }
// Findet/erstellt den Cart des aktuellen Nutzers (per Cookie oder User)
// über lib/cart.getOrCreateCart, fügt das Item hinzu bzw. erhöht die Menge.
//
// Hinweis: Stock wird hier NICHT reduziert — das passiert erst beim
// erfolgreichen Bestellabschluss in POST /api/orders.
// (Vermeidet, dass aufgegebene Warenkörbe Lager blockieren.)
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, CartItem, Item, eq, and } from 'astro:db';
import { getOrCreateCart } from '../../../lib/cart';
import { jsonOk, jsonError } from '../../../lib/http';

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1) Body parsen + minimal validieren
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Body ist kein gültiges JSON.', 400);
  }

  const itemId   = Number(body.itemId);
  const quantity = Number(body.quantity ?? 1);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return jsonError('Ungültige itemId.', 400);
  }
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
    return jsonError('Ungültige Menge.', 400);
  }

  // 2) Existiert das Item überhaupt?
  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  if (!product) {
    return jsonError('Artikel existiert nicht.', 404);
  }

  // 3) Cart finden oder anlegen (User -> Session -> neu, inkl. Cookie)
  const cart = await getOrCreateCart(cookies);

  // 4) Item-Position im Cart hinzufügen oder Menge erhöhen
  const existingItem = (await db.select().from(CartItem).where(
    and(eq(CartItem.cartId, cart.id), eq(CartItem.itemId, itemId))
  ))[0];

  // 5) Mengen-Check gegen den realen Lagerbestand
  const desiredTotal = (existingItem?.quantity ?? 0) + quantity;
  if (desiredTotal > product.stock) {
    return jsonError(`Nicht ausreichend verfügbar (Lager: ${product.stock}).`, 409);
  }

  if (existingItem) {
    await db.update(CartItem)
      .set({ quantity: desiredTotal })
      .where(eq(CartItem.id, existingItem.id));
  } else {
    await db.insert(CartItem).values({ cartId: cart.id, itemId, quantity });
  }

  // Stock-Reduzierung passiert erst bei Bestellabschluss (siehe pages/api/orders/index.ts)

  return jsonOk({ success: true });
};
