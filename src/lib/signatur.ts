// =====================================================================
// lib/signatur.ts — Archiv-Signatur & Klassifikation eines Items
// =====================================================================
// Vorher waren classifications/makeSignatur über index, archive, search,
// cart und product/[id] fünffach kopiert — und bereits auseinandergelaufen
// (5 vs. 7 Klassifikationen, d.h. dasselbe Produkt bekam je nach Seite
// eine andere Klassifikation). Hier zentral, eine Wahrheit für alle Seiten.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

const classifications = ['Reliquie', 'Massenware', 'Vestige', 'Mobiliar', 'Fundsache', 'Apparat', 'Utensil'];

/** Archiv-Signatur, z.B. "07.411" — stabil aus Langeweile-Index + ID. */
export function makeSignatur(id: number, boredom: number): string {
  const a = String(boredom).padStart(2, '0');
  const b = String((id * 137) % 1000).padStart(3, '0');
  return `${a}.${b}`;
}

/** Pseudo-zufällige, aber stabile Klassifikation eines Items. */
export function makeClassification(id: number): string {
  return classifications[id % classifications.length];
}
