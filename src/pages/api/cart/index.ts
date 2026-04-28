import type { APIRoute } from 'astro';
import { db, Cart, CartItem, Item, eq } from 'astro:db';

export const GET: APIRoute = async ({ cookies }) => {
  const sessionId = cookies.get('cart_session')?.value;

  // Kein Cookie → leerer Warenkorb
  if (!sessionId) {
    return new Response(JSON.stringify({ items: [], total: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  if (!cart) {
    return new Response(JSON.stringify({ items: [], total: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CartItems mit Produktdaten laden
  const cartItems = await db.select().from(CartItem).where(eq(CartItem.cartId, cart.id));
  const itemsWithDetails = await Promise.all(
    cartItems.map(async (cartItem) => {
      const product = (await db.select().from(Item).where(eq(Item.id, cartItem.itemId)))[0];
      return {
        cartItemId: cartItem.id,
        quantity: cartItem.quantity,
        product,
      };
    })
  );

  const total = itemsWithDetails.reduce(
    (sum, i) => sum + i.product.price * i.quantity, 0
  );

  return new Response(JSON.stringify({ items: itemsWithDetails, total }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};