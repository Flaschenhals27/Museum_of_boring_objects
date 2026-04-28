import type { APIRoute } from 'astro';
import { db, CartItem, Item, eq } from 'astro:db';

export const DELETE: APIRoute = async ({ request }) => {
  const { cartItemId, itemId, quantity } = await request.json();

  // Stock wieder erhöhen
  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  await db.update(Item)
    .set({ stock: product.stock + quantity })
    .where(eq(Item.id, itemId));

  await db.delete(CartItem).where(eq(CartItem.id, cartItemId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};