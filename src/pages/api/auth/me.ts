import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const payload = await getUserFromCookie(cookies);
  if (!payload) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = (await db.select().from(User).where(eq(User.id, payload.userId)))[0];
  if (!user) {
    return new Response(JSON.stringify({ user: null }), { status: 200 });
  }

  return new Response(JSON.stringify({
    user: { id: user.id, email: user.email, username: user.username, prename: user.prename }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};