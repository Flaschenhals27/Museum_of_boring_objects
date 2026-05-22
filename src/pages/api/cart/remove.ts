// =====================================================================
// pages/api/cart/remove.ts — Item aus dem Warenkorb entfernen
// =====================================================================
// DELETE mit { cartItemId, itemId, quantity }
//
// Hinweis: Stock wird hier NICHT verändert — der Stock wird erst beim
// Bestellabschluss (POST /api/orders) reduziert.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, CartItem, eq } from 'astro:db';

export const DELETE: APIRoute = async ({ request }) => {
  // 1) Body parsen
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body ist kein gültiges JSON.' }), { status: 400 });
  }

  const cartItemId = Number(body.cartItemId);
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return new Response(JSON.stringify({ error: 'Ungültige cartItemId.' }), { status: 400 });
  }

  // 2) CartItem löschen
  await db.delete(CartItem).where(eq(CartItem.id, cartItemId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
