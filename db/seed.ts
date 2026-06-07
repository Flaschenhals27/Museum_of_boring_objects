import { db, Item, Coupon } from 'astro:db';
import products from './products.json';
import { couponRows } from './coupon-data';

export default async function seed() {
  await db.insert(Item).values(products);
  console.log(`🏛️ ${products.length} Museumsobjekte erfolgreich in Astro DB geladen!`);

  // Gutschein-Codes (zentral gepflegt in db/coupon-data.ts)
  await db.insert(Coupon).values(couponRows());
  console.log('🎟️ Gutschein-Codes geladen.');
}
