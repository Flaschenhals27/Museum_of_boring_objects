import type { APIRoute } from 'astro';
import { db, Cart, CartItem, Item, eq } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const userPayload = await getUserFromCookie(cookies);
  const sessionId = cookies.get('cart_session')?.value;

  let cart;
  // Eingeloggt → userId-Warenkorb bevorzugen
  if (userPayload) {
    cart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  // Nicht eingeloggt oder kein userId-Warenkorb → sessionId
  if (!cart && sessionId) {
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  if (!cart) {
    return new Response(JSON.stringify({ items: [], total: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cartItems = await db.select().from(CartItem).where(eq(CartItem.cartId, cart.id));
  const itemsWithDetails = await Promise.all(
    cartItems.map(async (cartItem) => {
      const product = (await db.select().from(Item).where(eq(Item.id, cartItem.itemId)))[0];
      return { cartItemId: cartItem.id, quantity: cartItem.quantity, product };
    })
  );

  const total = itemsWithDetails.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return new Response(JSON.stringify({ items: itemsWithDetails, total }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};