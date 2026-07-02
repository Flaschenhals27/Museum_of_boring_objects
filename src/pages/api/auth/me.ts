import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { getUserFromCookie } from '../../../lib/auth';
import { jsonOk } from '../../../lib/http';

export const GET: APIRoute = async ({ cookies }) => {
  const payload = await getUserFromCookie(cookies);
  if (!payload) {
    return jsonOk({ user: null });
  }

  const user = (await db.select().from(User).where(eq(User.id, payload.userId)))[0];
  if (!user) {
    return jsonOk({ user: null });
  }

  return jsonOk({
    user: { id: user.id, email: user.email, username: user.username, prename: user.prename }
  });
};