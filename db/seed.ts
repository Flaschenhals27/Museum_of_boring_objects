import { db, Item } from 'astro:db';
import products from './products.json';

export default async function seed() {
  await db.insert(Item).values(products);
  console.log(`🏛️ ${products.length} Museumsobjekte erfolgreich in Astro DB geladen!`);
}