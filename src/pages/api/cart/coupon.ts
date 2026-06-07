// =====================================================================
// pages/api/cart/coupon.ts — Gutschein auf den Warenkorb anwenden
// =====================================================================
// POST   { code }  -> validiert den Code gegen die aktuelle Zwischensumme
//                     und vermerkt ihn auf dem Cart (Cart.couponCode).
// DELETE           -> entfernt den Gutschein vom Cart.
//
// Der tatsächliche Rabattbetrag wird nicht persistiert, sondern bei jedem
// Render (Cart/Checkout) und beim Bestellabschluss frisch berechnet —
// so bleibt er korrekt, wenn sich der Warenkorb ändert.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import type { APIRoute } from 'astro';
import { db, Cart, eq } from 'astro:db';
import { getCart, loadCartItems, cartSubtotal } from '../../../lib/cart';
import { validateCoupon, normalizeCode, describeCoupon } from '../../../lib/coupon';

// =====================================================================
// POST — Gutschein einlösen
// =====================================================================
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body ist kein gültiges JSON.' }), { status: 400 });
  }

  const code = normalizeCode(String(body?.code ?? ''));
  if (!code) {
    return new Response(JSON.stringify({ error: 'Bitte einen Gutschein-Code eingeben.' }), { status: 400 });
  }

  const cart = await getCart(cookies);
  if (!cart) {
    return new Response(JSON.stringify({ error: 'Kein Warenkorb gefunden.' }), { status: 400 });
  }

  const subtotal = cartSubtotal(await loadCartItems(cart.id));
  if (subtotal <= 0) {
    return new Response(JSON.stringify({ error: 'Ihr Warenkorb ist leer.' }), { status: 400 });
  }

  const result = await validateCoupon(code, subtotal);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), { status: 400 });
  }

  await db.update(Cart).set({ couponCode: result.coupon.code }).where(eq(Cart.id, cart.id));

  return new Response(JSON.stringify({
    success: true,
    code:     result.coupon.code,
    discount: result.discount,
    label:    describeCoupon(result.coupon),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// =====================================================================
// DELETE — Gutschein entfernen
// =====================================================================
export const DELETE: APIRoute = async ({ cookies }) => {
  const cart = await getCart(cookies);
  if (!cart) {
    return new Response(JSON.stringify({ error: 'Kein Warenkorb gefunden.' }), { status: 400 });
  }

  await db.update(Cart).set({ couponCode: null }).where(eq(Cart.id, cart.id));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
