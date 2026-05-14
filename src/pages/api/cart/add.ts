import type { APIRoute } from 'astro';
import { db, Cart, CartItem, Item, eq, and } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { itemId, quantity = 1 } = await request.json();

  // User prüfen
  const userPayload = await getUserFromCookie(cookies);

  let sessionId = cookies.get('cart_session')?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookies.set('cart_session', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
    });
  }

  // Warenkorb suchen – zuerst per userId wenn eingeloggt, sonst per sessionId
  let cart;
  if (userPayload) {
    cart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  if (!cart) {
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  // Warenkorb erstellen falls nicht vorhanden
  if (!cart) {
    await db.insert(Cart).values({
      sessionId,
      userId: userPayload?.userId ?? null,
      createdAt: new Date(),
    });
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }

  // Falls User eingeloggt und Cart noch keine userId hat → verknüpfen
  if (userPayload && !cart.userId) {
    await db.update(Cart).set({ userId: userPayload.userId }).where(eq(Cart.id, cart.id));
  }

  // Item hinzufügen oder Menge erhöhen
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

  await db.update(Item)
    .set({ stock: product.stock - quantity })
    .where(eq(Item.id, itemId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};