// =====================================================================
// pages/api/product/[id].ts — Mini-API für die RecentlyViewed-Komponente
// =====================================================================
// GET /api/product/:id
//
// Liefert minimale Item-Daten (id, name, price, thumbnail) für das
// Frontend. Strikte ID-Validierung wie auf der SSR-Page.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import type { APIRoute } from 'astro';
import { db, Item, eq } from 'astro:db';

export const GET: APIRoute = async ({ params }) => {
  const rawId = params.id ?? '';

  // Strikte Prüfung: positive Ganzzahl
  if (!/^[1-9]\d*$/.test(rawId)) {
    return new Response(JSON.stringify({ error: 'Ungültige Item-ID.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = parseInt(rawId, 10);
  const item = (await db.select().from(Item).where(eq(Item.id, id)))[0];

  if (!item) {
    return new Response(JSON.stringify({ error: 'Item nicht gefunden.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const images = (item.images as string[]) ?? [];

  return new Response(JSON.stringify({
    id: item.id,
    name: item.name,
    price: item.price,
    thumbnail: images[0] ?? null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
