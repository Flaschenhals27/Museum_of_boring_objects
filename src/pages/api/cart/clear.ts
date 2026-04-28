import type { APIRoute } from 'astro';
import { db, Cart, CartItem, eq } from 'astro:db';

export const DELETE: APIRoute = async ({ cookies }) => {
  const sessionId = cookies.get('cart_session')?.value;
  if (!sessionId) return new Response(JSON.stringify({ success: true }), { status: 200 });

  const cartRecord = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  if (cartRecord) {
    await db.delete(CartItem).where(eq(CartItem.cartId, cartRecord.id));
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};