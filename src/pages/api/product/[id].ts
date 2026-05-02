import type { APIRoute } from 'astro';
import { db, Item, eq } from 'astro:db';

export const GET: APIRoute = async ({ params }) => {
  const item = (await db.select().from(Item).where(eq(Item.id, Number(params.id))))[0];
  if (!item) return new Response(null, { status: 404 });

  const images = (item.images as string[]) ?? [];

  return new Response(JSON.stringify({
    id: item.id,
    name: item.name,
    price: item.price,
    thumbnail: images[0] ?? '/products/placeholder.jpg',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};