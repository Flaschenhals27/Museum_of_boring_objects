// =====================================================================
// pages/api/orders/index.ts — Bestellung abschicken
// =====================================================================
// POST /api/orders
//
// Erwartet:
//   { email, prename, surname, street, postal, city,
//     country (optional), paymentMethod (optional), notes (optional) }
//
// Liest:    aktuellen Warenkorb (über cart_session oder User)
// Schreibt: Order + OrderItems, reduziert Item.stock, löscht CartItems
// Versendet: Bestätigungsmails (Resend) — Anbieter + Kunde
// Setzt: Cookie 'order_placed' (für die Bestätigungsseite)
// Antwortet: { ok: true, bordereauNr } -> Client navigiert zu /order-confirmed
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.

import type { APIRoute } from 'astro';
import { db, Cart, CartItem, Item, Order, OrderItem, eq, sql } from 'astro:db';
import { Resend } from 'resend';
import { getUserFromCookie } from '../../../lib/auth';

// Versandkosten — könnten später dynamisch werden
const SHIPPING_COST = 12.00;

// ---------------------------------------------------------------------
// Hilfsfunktion: sprechende Bestellnummer (Bordereau) generieren
// ---------------------------------------------------------------------
// Format: "2026/00042"
// Wir nehmen das aktuelle Jahr und die nächste fortlaufende Nummer
// innerhalb dieses Jahres. Bei einer leeren DB beginnen wir bei 1.
// ---------------------------------------------------------------------
async function generateBordereauNr(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}/`;

  // Höchste bisherige Nummer in diesem Jahr suchen
  const existingOrders = await db
    .select({ bordereauNr: Order.bordereauNr })
    .from(Order)
    .where(sql`${Order.bordereauNr} LIKE ${prefix + '%'}`);

  let maxNum = 0;
  for (const row of existingOrders) {
    const numPart = row.bordereauNr.split('/')[1];
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  const nextNum = String(maxNum + 1).padStart(5, '0');
  return `${prefix}${nextNum}`;
}

// ---------------------------------------------------------------------
// Validierung: einfach und ohne Lib (Lerneffekt > Eleganz)
// ---------------------------------------------------------------------
function validate(body: any): { ok: true; data: any } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Ungültiger Request-Body.' };
  }

  const required = ['email', 'prename', 'surname', 'street', 'postal', 'city'];
  for (const field of required) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      return { ok: false, error: `Feld "${field}" fehlt oder ist leer.` };
    }
  }

  // E-Mail Plausibilität (sehr grobe Prüfung)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return { ok: false, error: 'E-Mail-Adresse hat kein gültiges Format.' };
  }

  // PLZ: 4-10 Zeichen (DE: 5, andere Länder anders)
  if (!/^[A-Za-z0-9 \-]{4,10}$/.test(body.postal)) {
    return { ok: false, error: 'Postleitzahl scheint ungültig.' };
  }

  return {
    ok: true,
    data: {
      email:        body.email.trim(),
      prename:      body.prename.trim(),
      surname:      body.surname.trim(),
      street:       body.street.trim(),
      postal:       body.postal.trim(),
      city:         body.city.trim(),
      country:      (body.country ?? 'Deutschland').trim(),
      paymentMethod: body.paymentMethod ?? 'milliardaer',
      notes:        body.notes?.trim() || null,
    }
  };
}

// =====================================================================
// POST /api/orders
// =====================================================================
export const POST: APIRoute = async ({ request, cookies }) => {
  // 1) Body parsen + validieren
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body ist kein gültiges JSON.' }), { status: 400 });
  }

  const validation = validate(body);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
  }
  const data = validation.data;

  // 2) Aktuellen Warenkorb finden (für eingeloggte User ODER per Cookie)
  const userPayload = await getUserFromCookie(cookies);
  const sessionId   = cookies.get('cart_session')?.value;

  let cartRecord;
  if (userPayload) {
    cartRecord = (await db.select().from(Cart).where(eq(Cart.userId, userPayload.userId)))[0];
  }
  if (!cartRecord && sessionId) {
    cartRecord = (await db.select().from(Cart).where(eq(Cart.sessionId, sessionId)))[0];
  }
  if (!cartRecord) {
    return new Response(JSON.stringify({ error: 'Kein Warenkorb gefunden.' }), { status: 400 });
  }

  // 3) Cart-Items + zugehörige Item-Daten laden
  const rawItems = await db.select().from(CartItem).where(eq(CartItem.cartId, cartRecord.id));
  if (rawItems.length === 0) {
    return new Response(JSON.stringify({ error: 'Warenkorb ist leer.' }), { status: 400 });
  }

  const productDetails = await Promise.all(
    rawItems.map(async (ci) => {
      const product = (await db.select().from(Item).where(eq(Item.id, ci.itemId)))[0];
      return { cartItem: ci, product };
    })
  );

  // 4) Lagerprüfung: jeder Artikel muss in ausreichender Menge vorhanden sein
  for (const { cartItem, product } of productDetails) {
    if (!product) {
      return new Response(JSON.stringify({ error: `Artikel #${cartItem.itemId} existiert nicht mehr.` }), { status: 400 });
    }
    if (product.stock < cartItem.quantity) {
      return new Response(JSON.stringify({
        error: `Nur noch ${product.stock} × "${product.name}" verfügbar.`,
      }), { status: 409 });
    }
  }

  // 5) Beträge berechnen
  const subtotal = productDetails.reduce(
    (sum, { cartItem, product }) => sum + product.price * cartItem.quantity,
    0
  );
  const shippingCost = SHIPPING_COST;
  const total        = subtotal + shippingCost;

  // 6) Bestellnummer generieren
  const bordereauNr = await generateBordereauNr();
  const now = new Date();

  // 7) Order in die DB schreiben
  // ----------------------------------------------------------------
  // Hinweis: astro:db unterstützt aktuell keine Multi-Statement-Transaktionen
  // (Drizzle/libSQL Limitation). Wir schreiben die Daten daher sequenziell.
  // In einer echten Produktion mit hohen Anforderungen müsste man hier
  // mit kompensierenden Aktionen arbeiten (Saga-Pattern), falls ein Schritt
  // fehlschlägt. Für unser Projekt ist das ausreichend.
  // ----------------------------------------------------------------
  const orderInsert = await db.insert(Order).values({
    bordereauNr,
    userId:        userPayload?.userId ?? null,
    sessionId:     sessionId ?? null,
    email:         data.email,
    addrPrename:   data.prename,
    addrSurname:   data.surname,
    addrStreet:    data.street,
    addrPostal:    data.postal,
    addrCity:      data.city,
    addrCountry:   data.country,
    subtotal,
    shippingCost,
    total,
    status:        'eingegangen',
    paymentMethod: data.paymentMethod,
    notes:         data.notes,
    createdAt:     now,
    updatedAt:     now,
  }).returning();
  const newOrder = orderInsert[0];

  // 8) OrderItems schreiben (mit Preis-Snapshot)
  await db.insert(OrderItem).values(
    productDetails.map(({ cartItem, product }) => ({
      orderId:       newOrder.id,
      itemId:        product.id,
      quantity:      cartItem.quantity,
      nameSnapshot:  product.name,
      priceSnapshot: product.price,
    }))
  );

  // 9) Lager reduzieren (pro Item ein UPDATE)
  for (const { cartItem, product } of productDetails) {
    await db.update(Item)
      .set({ stock: product.stock - cartItem.quantity })
      .where(eq(Item.id, product.id));
  }

  // 10) Warenkorb leeren
  await db.delete(CartItem).where(eq(CartItem.cartId, cartRecord.id));

  // 11) E-Mails versenden (an Anbieter UND Kunde)
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const itemRows = productDetails.map(({ cartItem, product }) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #e3d9c2; font-family:Lora,Georgia,serif;">${product.name}</td>
        <td style="padding:10px 0; border-bottom:1px solid #e3d9c2; text-align:center; font-family:monospace; font-size:.85rem;">× ${cartItem.quantity}</td>
        <td style="padding:10px 0; border-bottom:1px solid #e3d9c2; text-align:right; font-family:'Playfair Display',Georgia,serif; font-weight:700;">${(product.price * cartItem.quantity).toFixed(2)} €</td>
      </tr>
    `).join('');

    const emailHtml = (heading: string, intro: string) => `
      <div style="font-family:'Lora',Georgia,serif; max-width:600px; margin:0 auto; padding:2rem; background:#f3ede1; color:#1a1612;">
        <div style="border-bottom:1px solid #1a1612; padding-bottom:1rem; text-align:center; margin-bottom:2rem;">
          <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:2rem; font-weight:800; margin:0;">The Ordinary Emporium</h1>
          <p style="font-style:italic; color:#4a423a; font-size:.9rem; margin:.5rem 0 0;">Das Wochenblatt für vollkommen belanglose Gegenstände.</p>
        </div>
        <p style="font-family:monospace; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#7a1f1f; margin:0 0 .5rem;">${heading}</p>
        <h2 style="font-family:'Playfair Display',Georgia,serif; font-size:1.6rem; font-weight:800; margin:0 0 .5rem;">${intro}</h2>
        <p style="font-family:monospace; font-size:.78rem; color:#7a6f5f; margin:0 0 1.5rem;">Bordereau ${bordereauNr}</p>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; font-family:monospace; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#7a6f5f; padding-bottom:8px; border-bottom:1px solid #1a1612;">Artikel</th>
              <th style="text-align:center; font-family:monospace; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#7a6f5f; padding-bottom:8px; border-bottom:1px solid #1a1612;">Menge</th>
              <th style="text-align:right; font-family:monospace; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#7a6f5f; padding-bottom:8px; border-bottom:1px solid #1a1612;">Summe</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #1a1612;">
          <div style="display:flex; justify-content:space-between; padding:.3rem 0;">
            <span style="color:#7a6f5f;">Zwischensumme</span>
            <span>${subtotal.toFixed(2)} €</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:.3rem 0;">
            <span style="color:#7a6f5f;">Versand</span>
            <span>${shippingCost.toFixed(2)} €</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:.6rem 0 0; font-weight:700;">
            <span>Gesamt</span>
            <span style="font-family:'Playfair Display',Georgia,serif; font-size:1.4rem;">${total.toFixed(2)} €</span>
          </div>
        </div>
        <p style="font-family:monospace; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#7a6f5f; margin:2rem 0 0; text-align:center;">
          © ${now.getFullYear()} The Ordinary Emporium
        </p>
      </div>
    `;

    // An den Anbieter
    if (import.meta.env.MY_EMAIL) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to:   import.meta.env.MY_EMAIL,
        subject: `Neuer Eingang im Bordereau ${bordereauNr}`,
        html:    emailHtml('Eingang im Bordereau', 'Eine neue Bestellung ist eingegangen.'),
      });
    }

    // An den Kunden
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to:   data.email,
      subject: `Ihre Bestellung ist aktenkundig · Bordereau ${bordereauNr}`,
      html:    emailHtml('Bestätigung', 'Vielen Dank für Ihre angemessene Bestellung.'),
    });
  } catch (err) {
    // Mail-Fehler darf den Bestell-Erfolg nicht kippen
    console.error('Mail-Versand fehlgeschlagen:', err);
  }

  // 12) Cookie für die Bestätigungsseite setzen
  cookies.set('order_placed', bordereauNr, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60, // 60 Sekunden — nur für den Redirect
  });

  // 13) Antworten
  return new Response(JSON.stringify({ ok: true, bordereauNr }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};