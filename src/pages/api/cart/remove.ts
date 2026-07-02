// =====================================================================
// pages/api/cart/remove.ts — Item aus dem Warenkorb entfernen
// =====================================================================
// DELETE mit { cartItemId }
//
// Sicherheit: Es wird nur gelöscht, wenn die Position zum Warenkorb
// des Aufrufers gehört (sonst könnte jeder fremde Warenkörbe leeren).
//
// Hinweis: Stock wird hier NICHT verändert — der Stock wird erst beim
// Bestellabschluss (POST /api/orders) reduziert.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, CartItem, eq, and } from 'astro:db';
import { getCart } from '../../../lib/cart';
import { jsonOk, jsonError } from '../../../lib/http';

export const DELETE: APIRoute = async ({ request, cookies }) => {
  // 1) Body parsen
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Body ist kein gültiges JSON.', 400);
  }

  const cartItemId = Number(body.cartItemId);
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return jsonError('Ungültige cartItemId.', 400);
  }

  // 2) Nur im eigenen Warenkorb löschen
  const cart = await getCart(cookies);
  if (!cart) {
    return jsonError('Kein Warenkorb gefunden.', 404);
  }

  await db.delete(CartItem).where(
    and(eq(CartItem.id, cartItemId), eq(CartItem.cartId, cart.id))
  );

  return jsonOk({ success: true });
};
