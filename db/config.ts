import { defineDb, defineTable, column } from 'astro:db';

const Item = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    description: column.text(),
    boredom: column.number(),
    price: column.number(),
    stock: column.number(),
    features: column.json(),
    specs: column.json({ optional: true }), // z.B. { "Material": "Stahl", "Länge": "32mm" }
    images: column.json({optional: true}),
  }
});

const Cart = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    sessionId: column.text({ unique: true }), // zufälliger Cookie-Wert
    createdAt: column.date(),
  }
});

// NEU: Jedes Item im Warenkorb
const CartItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    cartId: column.number({ references: () => Cart.columns.id }),
    itemId: column.number({ references: () => Item.columns.id }),
    quantity: column.number(),
  }
});

export default defineDb({
  tables: { Item, Cart, CartItem },
});