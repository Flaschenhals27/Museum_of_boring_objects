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
      images: [
        '/products/clip/hero.jpg',
        '/products/clip/colorful.jpg',
        '/products/clip/red-white-red.jpg',
        '/products/clip/black.jpg',
      ],
      specs: {
        "Material": "Verzinkter Stahl",
        "Länge": "32 mm",
        "Breite": "8 mm",
        "Gewicht": "0.5 g",
        "Farbe": "Grau",
        "Tragkraft": "ca. 10 Blatt"
      },
      features: [
        {
          headline: "Revolutionäre Biegung.",
          subtext: "Jahrzehntelange Forschung flossen in diesen präzisen 47°-Winkel. Papier hat keine Chance."
        },
        {
          headline: "Grau. Aber nicht irgendein Grau.",
          subtext: "Ein Grau, das Stärke ausstrahlt. Dezent. Kraftvoll. Unaufgeregt. Legendär."
        },
        {
          headline: "Kompatibel mit jedem Papier.",
          subtext: "A4. A5. Sogar Notizzettel. Die Büroklammer kennt keine Grenzen."
        }
      ]
    },
    {
      id: 2,
      name: 'Ausgetrockneter Textmarker',
      description: 'Ehemals neongelb. Hinterlässt jetzt nur noch ein kratzendes Geräusch auf dem Papier.',
      boredom: 10,
      price: 24.50,
      stock: 3,
      images: [
        '/products/highlighter/hero.jpg',
        '/products/highlighter/five-pack.jpg',
        '/products/highlighter/four-pieces.jpg',
        '/products/highlighter/circle.jpg',
      ],
      specs: {
        "Material": "Kunststoff, trocken",
        "Länge": "135 mm",
        "Tinte": "Keine",
        "Farbe": "Ehemals Neongelb",
        "Geruch": "Leicht chemisch",
        "Zustand": "Hoffnungslos"
      },
      features: [
        {
          headline: "Das Ende des Lichts.",
          subtext: "Er war einmal leuchtend. Strahlend. Jetzt ist er trocken – und gerade deshalb unvergesslich."
        },
        {
          headline: "Ein Geräusch, das bleibt.",
          subtext: "Dieses charakteristische Kratzen. Wie Kreide auf einer Tafel, aber deutlich teurer."
        },
        {
          headline: "Seltenheit als Feature.",
          subtext: "Noch 3 auf Lager. Nicht weil wir wenig bestellt haben. Sondern weil die Nachfrage überwältigend war."
        }
      ]
    }
  ]);
  console.log('🏛️ Museumsobjekte erfolgreich in Astro DB geladen!');
}