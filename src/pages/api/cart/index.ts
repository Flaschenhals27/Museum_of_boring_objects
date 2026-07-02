// =====================================================================
// pages/api/cart/index.ts — aktuellen Warenkorb auslesen
// =====================================================================
// GET /api/cart
//
// Liefert: { items: [...], total: number }
//
// Behandelt den Fall, dass ein Item zwischenzeitlich aus der DB
// entfernt wurde: solche CartItems werden übersprungen und
// gleichzeitig aus dem Cart geräumt (selbstheilend).
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { getCart, loadCartItems, cartSubtotal } from '../../../lib/cart';
import { jsonOk } from '../../../lib/http';

export const GET: APIRoute = async ({ cookies }) => {
  const cart = await getCart(cookies);

  if (!cart) {
    return jsonOk({ items: [], total: 0 });
  }

  // prune: verwaiste Positionen (Item gelöscht) gleich aus dem Cart räumen
  const items = await loadCartItems(cart.id, { prune: true });
  const total = cartSubtotal(items);

  return jsonOk({ items, total });
};
