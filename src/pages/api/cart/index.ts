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
import { db, Cart, CartItem, Item, eq } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const userPayload = await getUserFromCookie(cookies);
  const sessionId   = cookies.get('cart_session')?.value;

  // Cart finden: erst per User, dann per Session
  let cart;
  if (userPayload) {
    cart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  if (!cart && sessionId) {
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  if (!cart) {
    return new Response(JSON.stringify({ items: [], total: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cartItems = await db.select().from(CartItem).where(eq(CartItem.cartId, cart.id));

  // Item-Daten dazuholen; verwaiste CartItems aussortieren
  const enriched = await Promise.all(
    cartItems.map(async (cartItem) => {
      const product = (await db.select().from(Item).where(eq(Item.id, cartItem.itemId)))[0];
      if (!product) {
        // Item existiert nicht mehr in der DB -> CartItem entfernen
        await db.delete(CartItem).where(eq(CartItem.id, cartItem.id));
        return null;
      }
      return { cartItemId: cartItem.id, quantity: cartItem.quantity, product };
    })
  );

  const items = enriched.filter((x): x is NonNullable<typeof x> => x !== null);
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return new Response(JSON.stringify({ items, total }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
