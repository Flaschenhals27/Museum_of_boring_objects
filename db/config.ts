// =====================================================================
// db/config.ts — Datenbank-Schema
// =====================================================================
// Erweitert um:
//   - Address  (Wiederverwendbare Adressen pro Nutzer)
//   - Order    (Bestellungen mit denormalisiertem Adress-Snapshot)
//   - OrderItem (Positionen einer Bestellung, mit Preis-Snapshot)
//   - Wishlist (Wunschliste — eingeloggte Nutzer ODER Session-Gäste)
//
// Hinweise zum Datenmodell-Verständnis:
//   - References = Foreign Keys (Beziehung zwischen Tabellen)
//   - "Snapshot"-Felder in Order/OrderItem speichern Werte zum Bestellzeitpunkt
//     unabhängig vom späteren Verlauf (Preis ändert sich, Adresse wird umzogen).
//   - astro:db nutzt darunter Drizzle ORM auf SQLite (lokal) bzw. libSQL/Turso (remote).
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt und manuell überprüft.

import { defineDb, defineTable, column } from 'astro:db';

// ---------------------------------------------------------------------
// User
// ---------------------------------------------------------------------
const User = defineTable({
  columns: {
    id:        column.number({ primaryKey: true, autoIncrement: true }),
    email:     column.text({ unique: true }),
    username:  column.text({ unique: true }),
    password:  column.text(),              // gehasht mit bcryptjs
    prename:   column.text(),
    surname:   column.text(),
    createdAt: column.date(),
  }
});

// ---------------------------------------------------------------------
// Item — der Katalog
// ---------------------------------------------------------------------
const Item = defineTable({
  columns: {
    id:          column.number({ primaryKey: true }),
    name:        column.text(),
    description: column.text(),
    boredom:     column.number(),          // Langeweile-Index 1-10
    price:       column.number(),
    stock:       column.number(),
    features:    column.json(),
    specs:       column.json({ optional: true }),
    images:      column.json({ optional: true }),
  }
});

// ---------------------------------------------------------------------
// Cart + CartItem — der aktive Warenkorb (vor Bestellung)
// ---------------------------------------------------------------------
const Cart = defineTable({
  columns: {
    id:         column.number({ primaryKey: true, autoIncrement: true }),
    sessionId:  column.text({ unique: true }),
    userId:     column.number({ optional: true, references: () => User.columns.id }),
    couponCode: column.text({ optional: true }),  // aktuell eingelöster Gutschein (siehe Coupon)
    createdAt:  column.date(),
  }
});

const CartItem = defineTable({
  columns: {
    id:       column.number({ primaryKey: true, autoIncrement: true }),
    cartId:   column.number({ references: () => Cart.columns.id }),
    itemId:   column.number({ references: () => Item.columns.id }),
    quantity: column.number(),
  }
});

// ---------------------------------------------------------------------
// Coupon — einlösbare Gutschein-/Rabattcodes
// ---------------------------------------------------------------------
// type === 'percent' -> value ist ein Prozentsatz (z.B. 10 = 10 %).
// type === 'fixed'   -> value ist ein fester Betrag in Euro.
// minSubtotal: optionaler Mindest-Bestellwert (auf die Zwischensumme bezogen).
// validFrom/validUntil: optionales Gültigkeitsfenster (NULL = unbegrenzt).
// maxRedemptions: optionales Einlöse-Limit (NULL = unbegrenzt); redeemedCount
//   zählt erfolgreiche Einlösungen (wird beim Bestellabschluss erhöht).
// Der angewendete Code wird auf dem Cart vermerkt (Cart.couponCode) und
// beim Bestellabschluss serverseitig neu berechnet & als Snapshot in der
// Order gespeichert.
// ---------------------------------------------------------------------
const Coupon = defineTable({
  columns: {
    id:             column.number({ primaryKey: true, autoIncrement: true }),
    code:           column.text({ unique: true }),   // immer in GROSSBUCHSTABEN gespeichert
    type:           column.text(),                    // 'percent' | 'fixed'
    value:          column.number(),
    active:         column.boolean({ default: true }),
    minSubtotal:    column.number({ optional: true }),
    validFrom:      column.date({ optional: true }),
    validUntil:     column.date({ optional: true }),
    maxRedemptions: column.number({ optional: true }),
    redeemedCount:  column.number({ default: 0 }),
    createdAt:      column.date(),
  }
});

// ---------------------------------------------------------------------
// Address — eingeloggte Nutzer können Adressen hinterlegen
// ---------------------------------------------------------------------
// Eine Adresse gehört genau einem Nutzer (n:1).
// Bei der Bestellung wird der Inhalt der Adresse in die Order kopiert (Snapshot),
// damit eine spätere Änderung der Adresse die Bestellhistorie nicht verfälscht.
// ---------------------------------------------------------------------
const Address = defineTable({
  columns: {
    id:        column.number({ primaryKey: true, autoIncrement: true }),
    userId:    column.number({ references: () => User.columns.id }),
    label:     column.text({ optional: true }),  // z.B. "Zuhause", "Büro"
    prename:   column.text(),
    surname:   column.text(),
    street:    column.text(),
    postal:    column.text(),
    city:      column.text(),
    country:   column.text({ default: 'Deutschland' }),
    isDefault: column.boolean({ default: false }),
    createdAt: column.date(),
  }
});

// ---------------------------------------------------------------------
// Order — die abgeschlossene Bestellung
// ---------------------------------------------------------------------
// userId ist optional, weil Gäste auch bestellen können (sessionId hält sie zusammen).
// Adresse, E-Mail und Versandkosten werden als Snapshot mitgespeichert.
// Der Status durchläuft: 'eingegangen' -> 'versendet' -> 'abgeschlossen'.
// ---------------------------------------------------------------------
const Order = defineTable({
  columns: {
    id:           column.number({ primaryKey: true, autoIncrement: true }),
    bordereauNr:  column.text({ unique: true }),  // z.B. "2026/00042" — fachlich sprechende ID
    token:        column.text({ optional: true }), // unrätbarer Zugriffstoken (zufällige UUID) für /order-confirmed
    userId:       column.number({ optional: true, references: () => User.columns.id }),
    sessionId:    column.text({ optional: true }),

    // Snapshot der Kontaktdaten und Lieferadresse zum Bestellzeitpunkt
    email:         column.text(),
    addrPrename:   column.text(),
    addrSurname:   column.text(),
    addrStreet:    column.text(),
    addrPostal:    column.text(),
    addrCity:      column.text(),
    addrCountry:   column.text({ default: 'Deutschland' }),

    // Beträge
    subtotal:     column.number(),                // Summe der Items
    shippingCost: column.number(),                // Versandkosten zum Zeitpunkt der Bestellung
    discount:     column.number({ default: 0 }),  // Gutschein-Rabatt zum Bestellzeitpunkt
    couponCode:   column.text({ optional: true }),// eingelöster Code (Snapshot)
    total:        column.number(),                // = subtotal + shippingCost - discount

    // Status & Meta
    status:       column.text({ default: 'eingegangen' }),  // siehe oben
    paymentMethod: column.text({ default: 'milliardaer' }), // bisher nur eine Option
    notes:        column.text({ optional: true }),

    createdAt:    column.date(),
    updatedAt:    column.date(),
  }
});

const OrderItem = defineTable({
  columns: {
    id:             column.number({ primaryKey: true, autoIncrement: true }),
    orderId:        column.number({ references: () => Order.columns.id }),
    itemId:         column.number({ references: () => Item.columns.id }),
    quantity:       column.number(),
    // Snapshots: Name & Preis zum Bestellzeitpunkt einfrieren
    nameSnapshot:   column.text(),
    priceSnapshot:  column.number(),
  }
});

// ---------------------------------------------------------------------
// Wishlist — Gäste UND eingeloggte Nutzer
// ---------------------------------------------------------------------
// Entweder userId ODER sessionId gesetzt — niemals beides leer.
// Beim Login werden Gast-Einträge automatisch dem User zugeordnet (Merge-Logik in der API).
// ---------------------------------------------------------------------
const Wishlist = defineTable({
  columns: {
    id:        column.number({ primaryKey: true, autoIncrement: true }),
    userId:    column.number({ optional: true, references: () => User.columns.id }),
    sessionId: column.text({ optional: true }),
    itemId:    column.number({ references: () => Item.columns.id }),
    addedAt:   column.date(),
  }
});

export default defineDb({
  tables: {
    User,
    Item,
    Cart,
    CartItem,
    Coupon,
    Address,
    Order,
    OrderItem,
    Wishlist,
  }
});
