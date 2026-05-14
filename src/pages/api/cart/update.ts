import type { APIRoute } from 'astro';
import { db, CartItem, Item, eq } from 'astro:db';

export const PUT: APIRoute = async ({ request }) => {
  const { cartItemId, itemId, oldQuantity, newQuantity } = await request.json();

  if (newQuantity < 1) {
    return new Response(JSON.stringify({ error: 'Menge muss mindestens 1 sein' }), { status: 400 });
  }

  // Stock anpassen – Differenz berechnen
  const product = (await db.select().from(Item).where(eq(Item.id, itemId)))[0];
  const diff = newQuantity - oldQuantity;

  if (diff > 0 && product.stock < diff) {
    return new Response(JSON.stringify({ error: 'Nicht genug auf Lager' }), { status: 400 });
  }

  await db.update(CartItem)
    .set({ quantity: newQuantity })
    .where(eq(CartItem.id, cartItemId));

  await db.update(Item)
    .set({ stock: product.stock - diff })
    .where(eq(Item.id, itemId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};