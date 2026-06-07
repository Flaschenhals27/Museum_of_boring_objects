// =====================================================================
// db/coupon-data.ts — zentrale Liste der Gutschein-Codes
// =====================================================================
// Wird vom regulären Seed (db/seed.ts, lokal/dev) UND vom separaten
// Remote-Seed (db/seed-coupons.ts) genutzt, damit die Codes nur an einer
// Stelle gepflegt werden.
//
// type === 'percent' -> value ist ein Prozentsatz (z.B. 10 = 10 %).
// type === 'fixed'   -> value ist ein fester Eurobetrag.
// =====================================================================

export function couponRows() {
  const now = new Date();
  const endOf2026 = new Date('2026-12-31T23:59:59');

  // Felder ohne Wert (null) bedeuten: keine Einschränkung.
  const base = {
    validFrom: null as Date | null,
    validUntil: null as Date | null,
    maxRedemptions: null as number | null,
    redeemedCount: 0,
    createdAt: now,
  };

  return [
    { code: 'LANGWEILE10',   type: 'percent', value: 10, active: true,  minSubtotal: null, ...base },
    { code: 'BELANGLOS5',    type: 'fixed',   value: 5,  active: true,  minSubtotal: 20,   ...base, maxRedemptions: 50 },
    { code: 'GLEICHGUELTIG', type: 'percent', value: 20, active: true,  minSubtotal: 50,   ...base, validUntil: endOf2026 },
    { code: 'ABGELAUFEN',    type: 'percent', value: 50, active: false, minSubtotal: null, ...base },
  ];
}
