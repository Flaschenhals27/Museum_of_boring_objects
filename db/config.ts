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
    sessionId: column.text({ unique: true }),
    userId: column.number({ optional: true }), // references entfernt
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

const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    email: column.text({ unique: true }),
    username: column.text({ unique: true }),
    password: column.text(), // gehasht
    prename: column.text(),
    surname: column.text(),
    createdAt: column.date(),
  }
});

export default defineDb({ tables: { Item, Cart, CartItem, User } });