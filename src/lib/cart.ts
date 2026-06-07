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
import { db, Cart, CartItem, Item, eq } from 'astro:db';
import { getUserFromCookie } from './auth';

export type CartLine = {
  cartItemId: number;
  itemId: number;
  quantity: number;
  product: typeof Item.$inferSelect;
};

/**
 * Findet den aktuellen Warenkorb: zuerst über den eingeloggten Nutzer,
 * danach über das Session-Cookie. Gibt undefined zurück, wenn keiner da ist.
 * Legt KEINEN Cart an (das macht POST /api/cart/add).
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
 * Lädt die Positionen eines Warenkorbs inkl. Produktdaten.
 * Verwaiste Positionen (zugehöriges Item gelöscht) werden übersprungen;
 * mit { prune: true } werden sie zusätzlich aus dem Cart entfernt
 * (selbstheilend).
 */
export async function loadCartItems(
  cartId: number,
  opts: { prune?: boolean } = {},
): Promise<CartLine[]> {
  const rows = await db.select().from(CartItem).where(eq(CartItem.cartId, cartId));

  const lines = await Promise.all(
    rows.map(async (ci) => {
      const product = (await db.select().from(Item).where(eq(Item.id, ci.itemId)))[0];
      if (!product) {
        if (opts.prune) await db.delete(CartItem).where(eq(CartItem.id, ci.id));
        return null;
      }
      return { cartItemId: ci.id, itemId: ci.itemId, quantity: ci.quantity, product };
    }),
  );

  return lines.filter((x): x is CartLine => x !== null);
}

/** Zwischensumme (Summe aus Preis × Menge) der übergebenen Positionen. */
export function cartSubtotal(lines: Array<{ product: { price: number }; quantity: number }>): number {
  return lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
}
