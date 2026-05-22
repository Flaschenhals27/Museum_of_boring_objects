// =====================================================================
// pages/api/cart/update.ts — Menge eines Cart-Items ändern
// =====================================================================
// PUT mit { cartItemId, itemId, newQuantity }
//
// Hinweis: Stock wird hier NICHT verändert. Wir prüfen aber, ob die
// gewünschte Menge überhaupt verfügbar ist.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, CartItem, Item, eq } from 'astro:db';

export const PUT: APIRoute = async ({ request }) => {
  // 1) Body parsen
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body ist kein gültiges JSON.' }), { status: 400 });
  }

  const cartItemId  = Number(body.cartItemId);
  const itemId      = Number(body.itemId);
  const newQuantity = Number(body.newQuantity);

  // 2) Validierung
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return new Response(JSON.stringify({ error: 'Ungültige cartItemId.' }), { status: 400 });
  }
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return new Response(JSON.stringify({ error: 'Ungültige itemId.' }), { status: 400 });
  }
  if (!Number.isInteger(newQuantity) || newQuantity < 1 || newQuantity > 100) {
    return new Response(JSON.stringify({ error: 'Menge muss zwischen 1 und 100 liegen.' }), { status: 400 });
  }

  // 3) Lagerprüfung gegen den realen Bestand
  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  if (!product) {
    return new Response(JSON.stringify({ error: 'Artikel existiert nicht.' }), { status: 404 });
  }
  if (newQuantity > product.stock) {
    return new Response(JSON.stringify({
      error: `Nicht ausreichend verfügbar (Lager: ${product.stock}).`,
    }), { status: 409 });
  }

  // 4) Menge aktualisieren
  await db.update(CartItem)
    .set({ quantity: newQuantity })
    .where(eq(CartItem.id, cartItemId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
