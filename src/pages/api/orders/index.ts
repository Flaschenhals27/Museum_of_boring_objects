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
// Nebenläufigkeit (astro:db kann keine Multi-Statement-Transaktionen):
//   - Stock wird ATOMAR reduziert (UPDATE ... SET stock = stock - n
//     WHERE stock >= n) — zwei gleichzeitige Bestellungen können denselben
//     Bestand nicht doppelt verkaufen. Schlägt eine Position fehl, werden
//     bereits abgezogene Positionen kompensiert (zurückgebucht).
//   - Die Bordereau-Nummer kann bei parallelen Bestellungen kollidieren
//     (unique-Constraint) — der Insert wird dann mit frischer Nummer
//     wiederholt.
//   - BEWUSSTE GRENZE: Stürzt der Prozess NACH der Stock-Reservierung,
//     aber VOR dem erfolgreichen Order-Insert ab (Crash, Stromausfall),
//     bleibt der Bestand abgezogen, ohne dass eine Bestellung existiert.
//     Ohne echte Transaktionen ist das nicht vollständig schließbar —
//     in Produktion bräuchte es ein Outbox-/Saga-Pattern oder einen
//     periodischen Abgleich.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.

import type { APIRoute } from 'astro';
import { db, Cart, CartItem, Item, Order, OrderItem, Coupon, eq, and, gte, sql } from 'astro:db';
import { Resend } from 'resend';
import { getUserFromCookie } from '../../../lib/auth';
import { getCart, loadCartItems, cartSubtotal, type CartLine } from '../../../lib/cart';
import { resolveDiscount } from '../../../lib/coupon';
import { renderOrderEmail } from '../../../lib/email';
import { jsonOk, jsonError } from '../../../lib/http';
import { SHIPPING_COST } from '../../../lib/shipping';
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit';

const ORDER_MAX_ATTEMPTS = 10;
const ORDER_WINDOW_MS    = 15 * 60 * 1000;

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

  // Feld-Keys mit deutschen Labels für die Fehlermeldung
  const required: Record<string, string> = {
    email:   'E-Mail',
    prename: 'Vorname',
    surname: 'Nachname',
    street:  'Straße & Hausnummer',
    postal:  'PLZ',
    city:    'Ort',
  };
  for (const [field, label] of Object.entries(required)) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      return { ok: false, error: `Das Feld "${label}" fehlt oder ist leer.` };
    }
  }

  // E-Mail Plausibilität (sehr grobe Prüfung)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return { ok: false, error: 'E-Mail-Adresse hat kein gültiges Format.' };
  }

  // PLZ: für Deutschland (Default, das Formular bietet kein anderes Land)
  // streng 5 Ziffern; für andere Länder (nur per API erreichbar) locker.
  const country = (body.country ?? 'Deutschland').trim();
  const postal  = body.postal.trim();
  if (country === 'Deutschland') {
    if (!/^\d{5}$/.test(postal)) {
      return { ok: false, error: 'Die PLZ muss aus genau 5 Ziffern bestehen.' };
    }
  } else if (!/^[A-Za-z0-9 \-]{3,10}$/.test(postal)) {
    return { ok: false, error: 'Postleitzahl scheint ungültig.' };
  }

  return {
    ok: true,
    data: {
      email:        body.email.trim(),
      prename:      body.prename.trim(),
      surname:      body.surname.trim(),
      street:       body.street.trim(),
      postal,
      city:         body.city.trim(),
      country,
      paymentMethod: body.paymentMethod ?? 'milliardaer',
      notes:        body.notes?.trim() || null,
    }
  };
}

// ---------------------------------------------------------------------
// Stock atomar reservieren: pro Position stock = stock - n, aber nur
// wenn noch genug da ist. Schlägt eine Position fehl, werden alle
// vorherigen Abzüge zurückgebucht und der Name des Artikels gemeldet.
// ---------------------------------------------------------------------
async function reserveStock(lines: CartLine[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const reserved: Array<{ itemId: number; quantity: number }> = [];

  for (const line of lines) {
    const updated = await db.update(Item)
      .set({ stock: sql`${Item.stock} - ${line.quantity}` })
      .where(and(eq(Item.id, line.itemId), gte(Item.stock, line.quantity)))
      .returning();

    if (updated.length === 0) {
      await releaseStock(reserved);
      const current = (await db.select().from(Item).where(eq(Item.id, line.itemId)))[0];
      return {
        ok: false,
        error: `Nur noch ${current?.stock ?? 0} × "${line.product.name}" verfügbar.`,
      };
    }
    reserved.push({ itemId: line.itemId, quantity: line.quantity });
  }

  return { ok: true };
}

/** Kompensation: bereits abgezogenen Stock wieder zurückbuchen. */
async function releaseStock(reserved: Array<{ itemId: number; quantity: number }>) {
  for (const r of reserved) {
    await db.update(Item)
      .set({ stock: sql`${Item.stock} + ${r.quantity}` })
      .where(eq(Item.id, r.itemId));
  }
}

// =====================================================================
// POST /api/orders
// =====================================================================
export const POST: APIRoute = async ({ request, cookies }) => {
  // 0) Rate-Limit (der teuerste Endpoint: DB-Schreiblast + Mail-Versand)
  const ip = getClientIp(request);
  const limit = checkRateLimit(`orders:${ip}`, ORDER_MAX_ATTEMPTS, ORDER_WINDOW_MS);
  if (!limit.allowed) {
    return jsonError(
      `Zu viele Bestellversuche. Bitte ${limit.retryAfterSec} Sekunden warten.`,
      429,
      { 'Retry-After': String(limit.retryAfterSec) },
    );
  }

  // 1) Body parsen + validieren
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError('Body ist kein gültiges JSON.', 400);
  }

  const validation = validate(body);
  if (!validation.ok) {
    return jsonError(validation.error, 400);
  }
  const data = validation.data;

  // 2) Identität (für den Order-Snapshot) + aktuellen Warenkorb ermitteln
  const userPayload = await getUserFromCookie(cookies);
  const sessionId   = cookies.get('cart_session')?.value;

  const cartRecord = await getCart(cookies);
  if (!cartRecord) {
    return jsonError('Kein Warenkorb gefunden.', 400);
  }

  // 3) Positionen inkl. Produktdaten laden (verwaiste werden ausgeräumt)
  const lines = await loadCartItems(cartRecord.id, { prune: true });
  if (lines.length === 0) {
    return jsonError('Warenkorb ist leer.', 400);
  }

  // 4) Beträge berechnen
  const subtotal = cartSubtotal(lines);

  // Gutschein serverseitig erneut prüfen & Rabatt berechnen (nie dem Client trauen)
  const { coupon, discount } = await resolveDiscount(cartRecord.couponCode, subtotal);
  const couponCode = coupon?.code ?? null;

  const shippingCost = SHIPPING_COST;
  const total        = Math.max(0, subtotal - discount) + shippingCost;

  // 5) Stock atomar reservieren — schlägt bei Parallelbestellung sauber fehl
  const reservation = await reserveStock(lines);
  if (!reservation.ok) {
    return jsonError(reservation.error, 409);
  }

  // 6) Order in die DB schreiben — mit Retry, falls die Bordereau-Nummer
  //    durch eine parallele Bestellung kollidiert (unique-Constraint)
  const token = crypto.randomUUID();
  const now = new Date();

  let newOrder: typeof Order.$inferSelect | undefined;
  let bordereauNr = '';
  for (let attempt = 0; attempt < 3 && !newOrder; attempt++) {
    bordereauNr = await generateBordereauNr();
    try {
      newOrder = (await db.insert(Order).values({
        bordereauNr,
        token,
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
        discount,
        couponCode,
        total,
        status:        'eingegangen',
        paymentMethod: data.paymentMethod,
        notes:         data.notes,
        createdAt:     now,
        updatedAt:     now,
      }).returning())[0];
    } catch (err) {
      if (attempt === 2) {
        // Aufgeben: reservierten Stock zurückbuchen, Fehler melden
        await releaseStock(lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })));
        console.error('Order-Insert nach 3 Versuchen fehlgeschlagen:', err);
        return jsonError('Bestellung konnte nicht angelegt werden. Bitte erneut versuchen.', 500);
      }
    }
  }

  // 7) OrderItems schreiben (mit Preis-Snapshot)
  await db.insert(OrderItem).values(
    lines.map((line) => ({
      orderId:       newOrder!.id,
      itemId:        line.itemId,
      quantity:      line.quantity,
      nameSnapshot:  line.product.name,
      priceSnapshot: line.product.price,
    }))
  );

  // 8) Warenkorb leeren (Positionen + eingelösten Gutschein zurücksetzen)
  await db.delete(CartItem).where(eq(CartItem.cartId, cartRecord.id));
  if (cartRecord.couponCode) {
    await db.update(Cart).set({ couponCode: null }).where(eq(Cart.id, cartRecord.id));
  }

  // 8b) Einlöse-Zähler des Gutscheins atomar erhöhen (falls angewendet)
  if (coupon) {
    await db.update(Coupon)
      .set({ redeemedCount: sql`${Coupon.redeemedCount} + 1` })
      .where(eq(Coupon.id, coupon.id));
  }

  // 9) E-Mails versenden (an Anbieter UND Kunde) — Template in lib/email.ts
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const emailData = {
      bordereauNr,
      lines: lines.map((l) => ({ name: l.product.name, quantity: l.quantity, price: l.product.price })),
      subtotal,
      discount,
      couponCode,
      shippingCost,
      total,
    };

    // An den Anbieter
    if (import.meta.env.MY_EMAIL) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to:   import.meta.env.MY_EMAIL,
        subject: `Neuer Eingang im Bordereau ${bordereauNr}`,
        html:    renderOrderEmail('Eingang im Bordereau', 'Eine neue Bestellung ist eingegangen.', emailData),
      });
    }

    // An den Kunden
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to:   data.email,
      subject: `Ihre Bestellung ist aktenkundig · Bordereau ${bordereauNr}`,
      html:    renderOrderEmail('Bestätigung', 'Vielen Dank für Ihre angemessene Bestellung.', emailData),
    });
  } catch (err) {
    // Mail-Fehler darf den Bestell-Erfolg nicht kippen
    console.error('Mail-Versand fehlgeschlagen:', err);
  }

  // 10) Cookie für die Bestätigungsseite setzen
  cookies.set('order_placed', bordereauNr, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60, // 60 Sekunden — nur für den Redirect
  });

  // 11) Antworten — der Client navigiert mit dem Token (nicht der ratbaren Nr)
  return jsonOk({ ok: true, bordereauNr, token });
};
