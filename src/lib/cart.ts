// =====================================================================
// lib/cart.ts — gemeinsame Warenkorb-Helfer
// =====================================================================
// Das Muster "aktuellen Cart finden (User -> Session)" und "Positionen
// inkl. Produktdaten laden" war über mehrere Seiten und API-Routen
// hinweg kopiert. Hier zentral, damit alle dieselbe Logik nutzen.
//
// Hinweis: Der Stock wird hier NICHT angefasst — er wird erst beim
// Bestellabschluss (POST /api/orders) reduziert.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import type { AstroCookies } from 'astro';
import { db, Cart, CartItem, Item, eq, inArray } from 'astro:db';
import { getUserFromCookie } from './auth';

export type CartLine = {
  cartItemId: number;
  itemId: number;
  quantity: number;
  product: typeof Item.$inferSelect;
};

/**
 * Liest die cart_session-ID aus dem Cookie — oder erzeugt eine neue
 * und setzt das Cookie (30 Tage, httpOnly). Vorher war diese Logik
 * in api/cart/add und api/wishlist dupliziert.
 */
export function getOrCreateSessionId(cookies: AstroCookies): string {
  let sessionId = cookies.get('cart_session')?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookies.set('cart_session', sessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  return sessionId;
}

/**
 * Findet den aktuellen Warenkorb: zuerst über den eingeloggten Nutzer,
 * danach über das Session-Cookie. Gibt undefined zurück, wenn keiner da ist.
 * Legt KEINEN Cart an (dafür gibt es getOrCreateCart).
 */
export async function getCart(cookies: AstroCookies) {
  const userPayload = await getUserFromCookie(cookies);
  const sessionId   = cookies.get('cart_session')?.value;

  let cart;
  if (userPayload) {
    cart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  if (!cart && sessionId) {
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }
  return cart;
}

/**
 * Wie getCart, legt aber einen neuen Cart an, wenn keiner existiert
 * (inkl. Session-Cookie). Ist der Nutzer eingeloggt und der gefundene
 * Cart noch nicht verknüpft, wird die userId nachgetragen.
 */
export async function getOrCreateCart(cookies: AstroCookies) {
  const userPayload = await getUserFromCookie(cookies);
  const sessionId   = getOrCreateSessionId(cookies);

  let cart;
  if (userPayload) {
    cart = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  if (!cart) {
    cart = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }
  if (!cart) {
    cart = (await db.insert(Cart).values({
      sessionId,
      userId: userPayload?.userId ?? null,
      createdAt: new Date(),
    }).returning())[0];
  }
  if (userPayload && !cart.userId) {
    // Privilegien-Wechsel: Gast-Cart wird einem User zugeordnet (z.B. nach
    // Registrierung). Dabei die sessionId ROTIEREN — die alte Gast-ID darf
    // keinen Zugriff auf den nun user-gebundenen Cart mehr gewähren
    // (gleiche Session-Rotation wie bei Login/Logout).
    const rotatedSessionId = crypto.randomUUID();
    await db.update(Cart)
      .set({ userId: userPayload.userId, sessionId: rotatedSessionId })
      .where(eq(Cart.id, cart.id));
    cookies.set('cart_session', rotatedSessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
    });
    cart = { ...cart, userId: userPayload.userId, sessionId: rotatedSessionId };
  }
  return cart;
}

/**
 * Lädt die Positionen eines Warenkorbs inkl. Produktdaten — in zwei
 * Queries statt einer pro Position (kein N+1).
 * Verwaiste Positionen (zugehöriges Item gelöscht) werden übersprungen;
 * mit { prune: true } werden sie zusätzlich aus dem Cart entfernt
 * (selbstheilend).
 */
export async function loadCartItems(
  cartId: number,
  opts: { prune?: boolean } = {},
): Promise<CartLine[]> {
  const rows = await db.select().from(CartItem).where(eq(CartItem.cartId, cartId));
  if (rows.length === 0) return [];

  const itemIds = [...new Set(rows.map((ci) => ci.itemId))];
  const products = await db.select().from(Item).where(inArray(Item.id, itemIds));
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: CartLine[] = [];
  const orphanedIds: number[] = [];
  for (const ci of rows) {
    const product = productById.get(ci.itemId);
    if (!product) {
      orphanedIds.push(ci.id);
      continue;
    }
    lines.push({ cartItemId: ci.id, itemId: ci.itemId, quantity: ci.quantity, product });
  }

  if (opts.prune && orphanedIds.length > 0) {
    await db.delete(CartItem).where(inArray(CartItem.id, orphanedIds));
  }

  return lines;
}

/** Zwischensumme (Summe aus Preis × Menge) der übergebenen Positionen. */
export function cartSubtotal(lines: Array<{ product: { price: number }; quantity: number }>): number {
  return lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
}
