import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

// JWT erstellen
export async function createToken(userId: number, email: string) {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// JWT prüfen
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; email: string };
  } catch {
    return null;
  }
}

// User aus Cookie holen
export async function getUserFromCookie(cookies: any) {
  const token = cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}