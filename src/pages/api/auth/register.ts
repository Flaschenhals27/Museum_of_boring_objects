import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import bcrypt from 'bcryptjs';
import { createToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, username, password, prename, surname } = await request.json();

  // Prüfen ob Email oder Username schon existiert
  const existing = await db.select().from(User).where(eq(User.email, email));
  if (existing.length > 0) {
    return new Response(JSON.stringify({ error: 'Email bereits registriert' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Passwort hashen
  const hashedPassword = await bcrypt.hash(password, 10);

  // User erstellen
  await db.insert(User).values({
    email,
    username,
    password: hashedPassword,
    prename,
    surname,
    createdAt: new Date(),
  });

  const newUser = (await db.select().from(User).where(eq(User.email, email)))[0];

  // JWT erstellen und in Cookie speichern
  const token = await createToken(newUser.id, newUser.email);
  cookies.set('auth_token', token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 Tage
    httpOnly: true,
    sameSite: 'lax',
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};