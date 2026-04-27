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

export default defineDb({
  tables: { Item },
});