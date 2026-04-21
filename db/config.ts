import { defineDb, defineTable, column } from 'astro:db';

const Item = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    description: column.text(),
    boredom: column.number(),
    price: column.number(),
    stock: column.number(),
  }
});

export default defineDb({
  tables: { Item },
});