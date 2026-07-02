// =====================================================================
// pages/api/cart/update.ts — Menge eines Cart-Items ändern
// =====================================================================
// PUT mit { cartItemId, newQuantity }
//
// Sicherheit: Die Position wird nur geändert, wenn sie zum Warenkorb
// des Aufrufers gehört (sonst könnte jeder fremde cartItemIds ändern).
// Die itemId wird aus der DB gelesen, nicht dem Client geglaubt.
//
// Hinweis: Stock wird hier NICHT verändert. Wir prüfen aber, ob die
// gewünschte Menge überhaupt verfügbar ist.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, CartItem, Item, eq, and } from 'astro:db';
import { getCart } from '../../../lib/cart';
import { jsonOk, jsonError } from '../../../lib/http';

export const PUT: APIRoute = async ({ request, cookies }) => {
  // 1) Body parsen
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Body ist kein gültiges JSON.', 400);
  }

  const cartItemId  = Number(body.cartItemId);
  const newQuantity = Number(body.newQuantity);

  // 2) Validierung
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return jsonError('Ungültige cartItemId.', 400);
  }
  if (!Number.isInteger(newQuantity) || newQuantity < 1 || newQuantity > 100) {
    return jsonError('Menge muss zwischen 1 und 100 liegen.', 400);
  }

  // 3) Position muss zum eigenen Warenkorb gehören
  const cart = await getCart(cookies);
  if (!cart) {
    return jsonError('Kein Warenkorb gefunden.', 404);
  }
  const cartItem = (await db.select().from(CartItem).where(
    and(eq(CartItem.id, cartItemId), eq(CartItem.cartId, cart.id))
  ))[0];
  if (!cartItem) {
    return jsonError('Position nicht gefunden.', 404);
  }

  // 4) Lagerprüfung gegen den realen Bestand
  const product = (await db.select().from(Item).where(eq(Item.id, cartItem.itemId)))[0];
  if (!product) {
    return jsonError('Artikel existiert nicht.', 404);
  }
  if (newQuantity > product.stock) {
    return jsonError(`Nicht ausreichend verfügbar (Lager: ${product.stock}).`, 409);
  }

  // 5) Menge aktualisieren
  await db.update(CartItem)
    .set({ quantity: newQuantity })
    .where(eq(CartItem.id, cartItem.id));

  return jsonOk({ success: true });
};
