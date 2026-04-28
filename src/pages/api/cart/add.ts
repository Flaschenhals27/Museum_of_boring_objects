import type { APIRoute } from 'astro';
import { db, Cart, CartItem, eq, and, Item } from 'astro:db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { itemId, quantity = 1 } = await request.json();

  // Session-ID aus Cookie holen oder neue erstellen
  let sessionId = cookies.get('cart_session')?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookies.set('cart_session', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 Tage
      httpOnly: true,
    });
  }

  // Warenkorb für diese Session holen oder erstellen
  let cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  if (!cart) {
    await db.insert(Cart).values({ sessionId, createdAt: new Date() });
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  // Prüfen ob das Item schon im Warenkorb ist
  const existingItem = (await db.select().from(CartItem).where(
    and(eq(CartItem.cartId, cart.id), eq(CartItem.itemId, itemId))
  ))[0];

  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];

  if (existingItem) {
    await db.update(CartItem)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(CartItem.id, existingItem.id));
  } else {
    await db.insert(CartItem).values({ cartId: cart.id, itemId, quantity });
  }

  // NEU: Stock immer reduzieren, egal ob neu oder erhöht
  await db.update(Item)
    .set({ stock: product.stock - quantity })
    .where(eq(Item.id, itemId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};