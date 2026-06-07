// =====================================================================
// lib/coupon.ts — Gutschein-Logik (zentral, damit Cart/Checkout/Orders
// dieselbe Berechnung nutzen)
// =====================================================================
// Ein Gutschein ist entweder prozentual ('percent', value = Prozentsatz)
// oder ein fester Eurobetrag ('fixed', value = Euro). Der Rabatt wird nur
// auf die Zwischensumme (subtotal) angewendet — niemals auf den Versand —
// und kann die Zwischensumme nicht übersteigen.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import { db, Coupon, eq } from 'astro:db';

export type CouponRow = {
  id: number;
  code: string;
  type: string;          // 'percent' | 'fixed'
  value: number;
  active: boolean;
  minSubtotal: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  createdAt: Date;
};

/** Normalisiert eine Code-Eingabe (trim + Großbuchstaben). */
export function normalizeCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

/** Lädt einen Gutschein anhand des (normalisierten) Codes — oder null. */
export async function findCoupon(code: string): Promise<CouponRow | null> {
  const norm = normalizeCode(code);
  if (!norm) return null;
  const row = (await db.select().from(Coupon).where(eq(Coupon.code, norm)))[0];
  return (row as CouponRow) ?? null;
}

/**
 * Prüft, ob ein Gutschein für die gegebene Zwischensumme aktuell einlösbar ist.
 * Gibt eine sprechende Fehlermeldung zurück — oder null, wenn alles passt.
 * Zentrale Stelle, damit stille Berechnung (computeDiscount) und aktive
 * Einlösung (validateCoupon) garantiert dieselben Regeln anwenden.
 */
export function couponBlockReason(
  coupon: CouponRow,
  subtotal: number,
  now: Date = new Date(),
): string | null {
  if (!coupon.active) {
    return 'Dieser Gutschein ist nicht (mehr) gültig.';
  }
  if (coupon.validFrom && now < coupon.validFrom) {
    return 'Dieser Gutschein ist noch nicht gültig.';
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return 'Dieser Gutschein ist abgelaufen.';
  }
  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    return 'Dieser Gutschein wurde bereits zu oft eingelöst.';
  }
  if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
    return `Dieser Gutschein gilt erst ab ${coupon.minSubtotal.toFixed(2)} € Warenwert.`;
  }
  return null;
}

/**
 * Berechnet den Rabattbetrag für einen Gutschein bei gegebener Zwischensumme.
 * Gibt 0 zurück, wenn der Gutschein aus irgendeinem Grund nicht einlösbar ist.
 * Auf 2 Nachkommastellen gerundet.
 */
export function computeDiscount(
  coupon: CouponRow | null,
  subtotal: number,
  now: Date = new Date(),
): number {
  if (!coupon) return 0;
  if (couponBlockReason(coupon, subtotal, now)) return 0;

  const raw = coupon.type === 'percent'
    ? subtotal * (coupon.value / 100)
    : coupon.value;

  const capped = Math.min(raw, subtotal);   // nie mehr als die Zwischensumme
  return Math.round(capped * 100) / 100;
}

/** Menschliche Kurzbeschreibung des Rabatts, z.B. "−10 %" oder "−5,00 €". */
export function describeCoupon(coupon: CouponRow): string {
  return coupon.type === 'percent'
    ? `−${coupon.value} %`
    : `−${coupon.value.toFixed(2)} €`;
}

type ValidateResult =
  | { ok: true; coupon: CouponRow; discount: number }
  | { ok: false; error: string };

/**
 * Validiert einen Code beim aktiven Einlösen durch den Nutzer.
 * Liefert eine sprechende Fehlermeldung, wenn etwas nicht passt.
 */
export async function validateCoupon(code: string, subtotal: number): Promise<ValidateResult> {
  const coupon = await findCoupon(code);
  if (!coupon) {
    return { ok: false, error: 'Diesen Gutschein-Code kennen wir nicht.' };
  }
  const reason = couponBlockReason(coupon, subtotal);
  if (reason) {
    return { ok: false, error: reason };
  }
  return { ok: true, coupon, discount: computeDiscount(coupon, subtotal) };
}

/**
 * Löst einen bereits auf dem Cart vermerkten Code still auf (für Seiten-Render
 * und Bestellabschluss). Ein zwischenzeitlich ungültig gewordener Code ergibt
 * einfach discount = 0, ohne Fehler.
 */
export async function resolveDiscount(
  couponCode: string | null | undefined,
  subtotal: number,
): Promise<{ coupon: CouponRow | null; discount: number }> {
  if (!couponCode) return { coupon: null, discount: 0 };
  const coupon = await findCoupon(couponCode);
  const discount = computeDiscount(coupon, subtotal);
  return { coupon: discount > 0 ? coupon : null, discount };
}
