import type { APIRoute } from 'astro';
import { db, Cart, eq } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  // NEU: Warenkorb bleibt per userId gespeichert – Session-Verknüpfung lösen
  const userPayload = await getUserFromCookie(cookies);
  if (userPayload) {
    const userCart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
    if (userCart) {
      // Session vom Warenkorb trennen – userId bleibt erhalten
      await db.update(Cart)
        .set({ sessionId: crypto.randomUUID() })
        .where(eq(Cart.id, userCart.id));
    }
  }

  cookies.delete('auth_token', { path: '/' });
  cookies.delete('cart_session', { path: '/' });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};