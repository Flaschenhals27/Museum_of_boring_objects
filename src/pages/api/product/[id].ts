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
import { jsonOk, jsonError } from '../../../lib/http';

export const GET: APIRoute = async ({ params }) => {
  const rawId = params.id ?? '';

  // Strikte Prüfung: positive Ganzzahl
  if (!/^[1-9]\d*$/.test(rawId)) {
    return jsonError('Ungültige Item-ID.', 400);
  }

  const id = parseInt(rawId, 10);
  const item = (await db.select().from(Item).where(eq(Item.id, id)))[0];

  if (!item) {
    return jsonError('Item nicht gefunden.', 404);
  }

  const images = (item.images as string[]) ?? [];

  return jsonOk({
    id: item.id,
    name: item.name,
    price: item.price,
    thumbnail: images[0] ?? null,
  });
};
