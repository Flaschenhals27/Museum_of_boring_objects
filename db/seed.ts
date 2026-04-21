import { db, Item } from 'astro:db';

export default async function seed() {
  await db.insert(Item).values([
    {
      id: 1,
      name: 'Standard-Büroklammer, grau',
      description: 'Ein ca. 3 cm langes Stück gebogener Draht. Hält Papier zusammen. Manchmal.',
      boredom: 9,
      price: 15.99,
      stock: 42,
    },
    {
      id: 2,
      name: 'Ausgetrockneter Textmarker',
      description: 'Ehemals neongelb. Hinterlässt jetzt nur noch ein kratzendes Geräusch auf dem Papier.',
      boredom: 10,
      price: 24.50,
      stock: 3,
    }
  ]);
  
  console.log('🏛️ Museumsobjekte erfolgreich in Astro DB geladen!');
}