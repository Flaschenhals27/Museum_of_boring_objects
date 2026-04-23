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
    image: column.text({optional: true}),
  }
});

export default defineDb({
  tables: { Item },
});