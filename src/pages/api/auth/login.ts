import type { APIRoute } from 'astro';
import { db, User, Cart, eq } from 'astro:db';
import bcrypt from 'bcryptjs';
import { createToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  const user = (await db.select().from(User).where(eq(User.email, email)))[0];
  if (!user) {
    return new Response(JSON.stringify({ error: 'Email oder Passwort falsch' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Email oder Passwort falsch' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = await createToken(user.id, user.email);
  cookies.set('auth_token', token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
  });

  // NEU: Session-Warenkorb mit User verknüpfen falls vorhanden
  const sessionId = cookies.get('cart_session')?.value;
  if (sessionId) {
    const sessionCart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
    const userCart = (await db.select().from(Cart).where(eq(Cart.userId, user.id)))[0];

    if (sessionCart && !userCart) {
      // Session-Warenkorb dem User zuweisen
      await db.update(Cart).set({ userId: user.id }).where(eq(Cart.id, sessionCart.id));
    }
  }

  return new Response(JSON.stringify({
    success: true,
    user: { id: user.id, email: user.email, username: user.username, prename: user.prename }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};