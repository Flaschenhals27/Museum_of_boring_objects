// =====================================================================
// db/seed-coupons.ts — NUR die Gutschein-Codes einspielen
// =====================================================================
// Gedacht für die Remote-DB, wo `astro db push` zwar das Schema migriert,
// aber keinen Seed ausführt. Anders als db/seed.ts fügt dieses Skript
// KEINE Produkte ein (sonst gäbe es Duplikate in der Remote-DB).
//
// Idempotent: bereits vorhandene Codes werden übersprungen, daher gefahrlos
// mehrfach ausführbar.
//
// Ausführen:
//   npx astro db execute db/seed-coupons.ts --remote   (Remote-DB)
//   npx astro db execute db/seed-coupons.ts            (lokale DB)
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import { db, Coupon } from 'astro:db';
import { couponRows } from './coupon-data';

export default async function seedCoupons() {
  const existing = await db.select({ code: Coupon.code }).from(Coupon);
  const existingCodes = new Set(existing.map((c) => c.code));

  const toInsert = couponRows().filter((c) => !existingCodes.has(c.code));

  if (toInsert.length === 0) {
    console.log('🎟️ Alle Gutschein-Codes sind bereits vorhanden — nichts zu tun.');
    return;
  }

  await db.insert(Coupon).values(toInsert);
  console.log(`🎟️ ${toInsert.length} Gutschein-Code(s) eingefügt: ${toInsert.map((c) => c.code).join(', ')}`);
}
